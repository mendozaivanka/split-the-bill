const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const { simplifyDebts } = require('./lib/settle');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Browser files live in public/. Vercel serves that folder itself; this covers running the server anywhere else
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// The settlement maths is shared with the browser. It stays outside public/ because Vercel leaves
// public/ out of the server bundle, so the server hands it to the browser itself.
app.get('/lib/settle.js', (req, res) => {
    res.type('application/javascript').sendFile(path.join(__dirname, 'lib', 'settle.js'));
});

// Configure Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// In-memory room store: code -> { members: [], expenses: [] }.
// A Map, so codes like "__proto__" can't reach Object.prototype.
const rooms = new Map();

const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;
const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const EMPTY_ROOM_TTL_MS = 30 * 60 * 1000; // keep an empty room this long so reconnects still find it
const LIMITS = { members: 50, nameLength: 50, expenses: 500, titleLength: 120 };

// Private Persistent Session
// A single passcode-protected room stored in Postgres. Enabled only when both
// DATABASE_URL and PRIVATE_PASSCODE are set. The code is 7 chars, so it can
// never collide with a generated 6-char room code.
const PRIVATE_CODE = 'PRIVATE';
const PRIVATE_PASSCODE = process.env.PRIVATE_PASSCODE || '';
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;
const privateEnabled = Boolean(pool && PRIVATE_PASSCODE);
let saveQueue = Promise.resolve();

// Passcode guessing limits
const PRIVATE_ATTEMPTS_PER_SOCKET = 5;
const PRIVATE_ATTEMPTS_PER_IP = 20;
const ATTEMPT_WINDOW_MS = 60 * 1000;
const FAILED_PASSCODE_DELAY_MS = 1000;
const attemptsByIp = new Map();

async function initPrivateSession() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS private_session (
            id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    const { rows } = await pool.query('SELECT data FROM private_session WHERE id = 1');
    rooms.set(PRIVATE_CODE, (rows[0] && sanitizeRoomData(rows[0].data)) || { members: [], expenses: [] });
}

function savePrivateSession(roomData) {
    // Chain writes so they reach the database in the order they were received
    saveQueue = saveQueue.catch(() => {}).then(() => pool.query(
        `INSERT INTO private_session (id, data, updated_at) VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(roomData)]
    ));
    return saveQueue;
}

function passcodeMatches(input) {
    const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
    return crypto.timingSafeEqual(hash(input), hash(PRIVATE_PASSCODE));
}

const cleanName = (v) => (typeof v === 'string' ? v.trim().slice(0, LIMITS.nameLength) : '');
const cleanNumber = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};

// Returns a cleaned copy of the room data, or null if it is not room data at all
function sanitizeRoomData(roomData) {
    if (!roomData || typeof roomData !== 'object') return null;
    if (!Array.isArray(roomData.members) || !Array.isArray(roomData.expenses)) return null;
    if (roomData.members.length > LIMITS.members || roomData.expenses.length > LIMITS.expenses) return null;

    const members = [...new Set(roomData.members.map(cleanName).filter(Boolean))];
    const isMember = (name) => members.includes(name);

    const expenses = [];
    for (const exp of roomData.expenses) {
        if (!exp || typeof exp !== 'object') return null;
        const id = typeof exp.id === 'string' || typeof exp.id === 'number' ? String(exp.id).slice(0, 64) : null;
        if (!id) return null;
        const splitMode = exp.splitMode === 'CUSTOM' ? 'CUSTOM' : 'EQUAL';
        const customShares = {};
        if (splitMode === 'CUSTOM' && exp.customShares && typeof exp.customShares === 'object') {
            for (const [person, val] of Object.entries(exp.customShares)) {
                if (isMember(person)) customShares[person] = cleanNumber(val);
            }
        }
        const payer = cleanName(exp.payer);
        expenses.push({
            id,
            title: typeof exp.title === 'string' ? exp.title.slice(0, LIMITS.titleLength) : '',
            amount: cleanNumber(exp.amount),
            payer: isMember(payer) ? payer : '',
            splitMode,
            splitWith: Array.isArray(exp.splitWith) ? [...new Set(exp.splitWith.map(cleanName).filter(isMember))] : [],
            customShares
        });
    }
    return { members, expenses };
}

function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS[crypto.randomInt(ROOM_CODE_CHARS.length)];
    return code;
}

// Public rooms are deleted once nobody has been in them for EMPTY_ROOM_TTL_MS
const cleanupTimers = new Map();

function cancelCleanup(code) {
    clearTimeout(cleanupTimers.get(code));
    cleanupTimers.delete(code);
}

function scheduleCleanup(code) {
    if (!code || code === PRIVATE_CODE) return;
    const occupants = io.sockets.adapter.rooms.get(code);
    if (occupants && occupants.size) return;
    cancelCleanup(code);
    const timer = setTimeout(() => {
        cleanupTimers.delete(code);
        const stillThere = io.sockets.adapter.rooms.get(code);
        if (!stillThere || !stillThere.size) rooms.delete(code);
    }, EMPTY_ROOM_TTL_MS);
    if (timer.unref) timer.unref();
    cleanupTimers.set(code, timer);
}

function leaveCurrentRoom(socket) {
    const code = socket.data.room;
    if (!code) return;
    socket.leave(code);
    socket.data.room = null;
    if (code === PRIVATE_CODE) socket.data.privateAuthed = false;
    scheduleCleanup(code);
}

function enterRoom(socket, code) {
    if (socket.data.room !== code) leaveCurrentRoom(socket);
    socket.join(code);
    socket.data.room = code;
    cancelCleanup(code);
}

function clientIp(socket) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    return (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) || socket.handshake.address;
}

// Records an attempt and returns true when the caller is over the limit
function overLimit(list, max) {
    const now = Date.now();
    while (list.length && now - list[0] > ATTEMPT_WINDOW_MS) list.shift();
    list.push(now);
    return list.length > max;
}

app.post('/api/calculate', (req, res) => {
    const { expenses } = req.body;
    if (!Array.isArray(expenses)) return res.status(400).json({ error: 'Invalid expenses array.' });
    res.json(simplifyDebts(expenses));
});

app.get('/api/private-enabled', (req, res) => {
    res.json({ enabled: privateEnabled });
});

io.on('connection', (socket) => {
    socket.data.privateAttempts = [];

    socket.on('create_room', () => {
        let code = generateRoomCode();
        while (rooms.has(code)) code = generateRoomCode();

        rooms.set(code, { members: [], expenses: [] });
        enterRoom(socket, code);
        socket.emit('room_created', { code, roomData: rooms.get(code) });
    });

    socket.on('join_room', (code) => {
        const upperCode = String(code || '').toUpperCase().trim();
        if (upperCode !== PRIVATE_CODE && rooms.has(upperCode)) {
            enterRoom(socket, upperCode);
            socket.emit('room_joined', { code: upperCode, roomData: rooms.get(upperCode) });
        } else {
            socket.emit('room_missing', upperCode);
        }
    });

    // Recreate a room that vanished (e.g. the server restarted) from a client's local copy
    socket.on('restore_room', (payload) => {
        const code = String((payload && payload.code) || '').toUpperCase().trim();
        if (!ROOM_CODE_RE.test(code)) return socket.emit('error_message', 'That room code is not valid.');
        if (!rooms.has(code)) {
            const roomData = sanitizeRoomData(payload.roomData);
            if (!roomData) return socket.emit('error_message', 'Could not restore the room: its data was not valid.');
            rooms.set(code, roomData);
        }
        // If someone else restored it first, join their copy
        enterRoom(socket, code);
        socket.emit('room_joined', { code, roomData: rooms.get(code) });
    });

    socket.on('leave_room', () => leaveCurrentRoom(socket));

    socket.on('join_private', (passcode) => {
        if (!privateEnabled) {
            return socket.emit('error_message', 'The private ledger is not set up on this server.');
        }
        const ip = clientIp(socket);
        if (!attemptsByIp.has(ip)) attemptsByIp.set(ip, []);
        const ipLimited = overLimit(attemptsByIp.get(ip), PRIVATE_ATTEMPTS_PER_IP);
        const socketLimited = overLimit(socket.data.privateAttempts, PRIVATE_ATTEMPTS_PER_SOCKET);
        if (ipLimited || socketLimited) {
            return socket.emit('private_denied', 'Too many attempts. Wait a minute and try again.');
        }
        if (!passcodeMatches(passcode || '')) {
            return setTimeout(() => socket.emit('private_denied', 'Wrong passcode.'), FAILED_PASSCODE_DELAY_MS);
        }
        enterRoom(socket, PRIVATE_CODE);
        socket.data.privateAuthed = true;
        socket.emit('room_joined', { code: PRIVATE_CODE, roomData: rooms.get(PRIVATE_CODE) });
    });

    socket.on('update_room_data', async (payload) => {
        const code = payload && payload.code;
        // Only accept writes to the room this socket actually joined
        if (!code || socket.data.room !== code) return;
        const roomData = sanitizeRoomData(payload.roomData);
        if (!roomData) return socket.emit('error_message', 'That change was not valid and was not saved.');

        if (code === PRIVATE_CODE) {
            if (!socket.data.privateAuthed) return;
            try {
                await savePrivateSession(roomData);
            } catch (err) {
                console.error('Private session save failed:', err);
                return socket.emit('error_message', 'Could not save to the database. Your last change was not saved.');
            }
            rooms.set(PRIVATE_CODE, roomData);
            socket.to(PRIVATE_CODE).emit('room_data_updated', roomData);
            return;
        }

        if (!rooms.has(code)) return socket.emit('room_missing', code);
        rooms.set(code, roomData);
        // Everyone else in the room; the sender already has this state
        socket.to(code).emit('room_data_updated', roomData);
    });

    socket.on('disconnect', () => scheduleCleanup(socket.data.room));
});

// Forget old passcode-attempt records
setInterval(() => {
    const now = Date.now();
    for (const [ip, list] of attemptsByIp) {
        if (!list.length || now - list[list.length - 1] > ATTEMPT_WINDOW_MS) attemptsByIp.delete(ip);
    }
}, ATTEMPT_WINDOW_MS).unref();

// Fallback to index.html in the root directory for single page application routing
app.get('*', (req, res) => {
    // A missing file (script, stylesheet, image) is a real 404, not the page
    if (path.extname(req.path)) return res.status(404).send('Not found');
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

async function start() {
    if (privateEnabled) {
        await initPrivateSession();
        console.log('🔒 Private ledger loaded from database');
    }
    server.listen(PORT, () => {
        console.log(`🚀 Real-Time Expense Server running on port ${PORT}`);
    });
}

start().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
});
