const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Serve static files directly from the repository root directory
app.use(express.static(path.join(__dirname)));

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Allows requests from your frontend
    methods: ["GET", "POST"]
  }
});

// In-Memory Room Data Store
// { "ROOM12": { members: [], expenses: [] } }
const rooms = {};

// Generate 6-Character Room Code
// function generateRoomCode() {
//     return Math.random().toString(36).substring(2, 8).toUpperCase();
// }

// Debt Simplification Core Engine
// function simplifyDebts(expenses) {
//     const balances = {};

//     expenses.forEach(exp => {
//         const payer = exp.payer;
//         const totalAmount = parseFloat(exp.amount) || 0;
//         const splitMode = exp.splitMode || 'EQUAL';
//         const group = exp.splitWith || [];

//         if (!group.length || totalAmount <= 0) return;

//         balances[payer] = (balances[payer] || 0) + totalAmount;

//         if (splitMode === 'CUSTOM' && exp.customShares) {
//             group.forEach(person => {
//                 const share = parseFloat(exp.customShares[person]) || 0;
//                 balances[person] = (balances[person] || 0) - share;
//             });
//         } else {
//             const equalShare = totalAmount / group.length;
//             group.forEach(person => {
//                 balances[person] = (balances[person] || 0) - equalShare;
//             });
//         }
//     });

//     const debtors = [];
//     const creditors = [];

//     Object.keys(balances).forEach(person => {
//         const net = balances[person];
//         if (net < -0.01) debtors.push({ name: person, amount: -net });
//         else if (net > 0.01) creditors.push({ name: person, amount: net });
//     });

//     const settlements = [];
//     let i = 0, j = 0;

//     while (i < debtors.length && j < creditors.length) {
//         const debtor = debtors[i];
//         const creditor = creditors[j];

//         const settleAmount = Math.min(debtor.amount, creditor.amount);

//         settlements.push({
//             from: debtor.name,
//             to: creditor.name,
//             amount: Math.round(settleAmount * 100) / 100
//         });

//         debtor.amount -= settleAmount;
//         creditor.amount -= settleAmount;

//         if (debtor.amount < 0.01) i++;
//         if (creditor.amount < 0.01) j++;
//     }

//     return { balances, settlements };
// }
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function simplifyDebts(expenses) {
    const balances = {};

    expenses.forEach(exp => {
        const payer = exp.payer;
        const totalAmount = parseFloat(exp.amount) || 0;
        const splitMode = exp.splitMode || 'EQUAL';

        if (totalAmount <= 0 || !payer) return;

        // Credit the payer for the full amount
        balances[payer] = (balances[payer] || 0) + totalAmount;

        if (splitMode === 'CUSTOM' && exp.customShares) {
            // Debit custom shares directly from customShares map
            Object.keys(exp.customShares).forEach(person => {
                const share = parseFloat(exp.customShares[person]) || 0;
                if (share > 0) {
                    balances[person] = (balances[person] || 0) - share;
                }
            });
        } else {
            // Equal division
            const group = exp.splitWith || [];
            if (!group.length) return;
            const equalShare = totalAmount / group.length;
            group.forEach(person => {
                balances[person] = (balances[person] || 0) - equalShare;
            });
        }
    });

    const debtors = [];
    const creditors = [];

    Object.keys(balances).forEach(person => {
        const net = balances[person];
        if (net < -0.01) debtors.push({ name: person, amount: -net });
        else if (net > 0.01) creditors.push({ name: person, amount: net });
    });

    const settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const settleAmount = Math.min(debtor.amount, creditor.amount);

        settlements.push({
            from: debtor.name,
            to: creditor.name,
            amount: Math.round(settleAmount * 100) / 100
        });

        debtor.amount -= settleAmount;
        creditor.amount -= settleAmount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return { balances, settlements };
}

app.post('/api/calculate', (req, res) => {
    const { expenses } = req.body;
    if (!Array.isArray(expenses)) return res.status(400).json({ error: 'Invalid expenses array.' });
    res.json(simplifyDebts(expenses));
});

io.on('connection', (socket) => {
    socket.on('create_room', () => {
        let code = generateRoomCode();
        while (rooms[code]) code = generateRoomCode();

        rooms[code] = { members: [], expenses: [] };
        socket.join(code);
        socket.emit('room_created', { code, roomData: rooms[code] });
    });

    socket.on('join_room', (code) => {
        const upperCode = (code || '').toUpperCase().trim();
        if (rooms[upperCode]) {
            socket.join(upperCode);
            socket.emit('room_joined', { code: upperCode, roomData: rooms[upperCode] });
        } else {
            socket.emit('error_message', 'Room code not found. Check the code and try again.');
        }
    });

    socket.on('update_room_data', ({ code, roomData }) => {
        if (rooms[code]) {
            rooms[code] = roomData;
            io.to(code).emit('room_data_updated', roomData);
        }
    });
});

// Fallback to index.html in the root directory for single page application routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`🚀 Real-Time Expense Server running on port ${PORT}`);
});