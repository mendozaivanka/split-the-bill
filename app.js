const { useState, useEffect, useRef, useMemo } = React;

const PRIVATE_CODE = 'PRIVATE';
const PRIVATE_PASSCODE_KEY = 'privatePasscode';

const newId = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function App() {
    const [roomCode, setRoomCode] = useState('');
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [privateEnabled, setPrivateEnabled] = useState(false);

    const socketRef = useRef(null);
    const privatePasscodeRef = useRef(null);
    // Mirrors of state for socket handlers, which are registered once
    const roomCodeRef = useRef('');
    const stateRef = useRef({ members: [], expenses: [] });
    // The public room we expect to be in: set when joining, kept across disconnects
    const rejoinCodeRef = useRef(null);

    const setRoom = (code) => {
        roomCodeRef.current = code;
        setRoomCode(code);
    };

    const applyRoomData = (roomData) => {
        const next = { members: roomData.members || [], expenses: roomData.expenses || [] };
        stateRef.current = next;
        setMembers(next.members);
        setExpenses(next.expenses);
    };

    const resetLocal = () => applyRoomData({ members: [], expenses: [] });

    useEffect(() => {
        const socket = io(window.location.origin);
        socketRef.current = socket;

        const onEntered = ({ code, roomData }) => {
            setRoom(code);
            rejoinCodeRef.current = code === PRIVATE_CODE ? null : code;
            applyRoomData(roomData);
        };
        socket.on('room_created', onEntered);
        socket.on('room_joined', onEntered);

        socket.on('room_data_updated', applyRoomData);

        socket.on('room_missing', (code) => {
            const hasLocalCopy = rejoinCodeRef.current === code && roomCodeRef.current === code;
            if (!hasLocalCopy) {
                alert('Room code not found. Check the code and try again.');
                return;
            }
            const { members, expenses } = stateRef.current;
            const restore = confirm(
                `Room ${code} is no longer on the server (it probably restarted).\n\n` +
                `Restore it from this device? It has ${members.length} people and ${expenses.length} expenses.`
            );
            if (restore) {
                socket.emit('restore_room', { code, roomData: stateRef.current });
            } else {
                rejoinCodeRef.current = null;
                setRoom('');
                resetLocal();
            }
        });

        socket.on('error_message', (msg) => alert(msg));

        socket.on('private_denied', (msg) => {
            privatePasscodeRef.current = null;
            try { localStorage.removeItem(PRIVATE_PASSCODE_KEY); } catch (err) {}
            if (roomCodeRef.current === PRIVATE_CODE) {
                setRoom('');
                resetLocal();
            }
            alert(msg);
        });

        // Socket.IO drops room membership on reconnect (e.g. after Render wakes the server), so rejoin
        socket.on('connect', () => {
            if (privatePasscodeRef.current) {
                socket.emit('join_private', privatePasscodeRef.current);
            } else if (rejoinCodeRef.current) {
                socket.emit('join_room', rejoinCodeRef.current);
            }
        });

        fetch('/api/private-enabled')
            .then(res => res.json())
            .then(data => setPrivateEnabled(Boolean(data.enabled)))
            .catch(() => setPrivateEnabled(false));

        const codeFromUrl = new URLSearchParams(window.location.search).get('room');
        if (codeFromUrl) joinRoom(codeFromUrl);

        return () => socket.disconnect();
    }, []);

    // Settlements are pure maths, so work them out here instead of asking the server
    const { balances, settlements } = useMemo(() => simplifyDebts(expenses), [expenses]);

    const emitStateChange = (newMembers, newExpenses) => {
        stateRef.current = { members: newMembers, expenses: newExpenses };
        setMembers(newMembers);
        setExpenses(newExpenses);

        if (roomCodeRef.current) {
            socketRef.current.emit('update_room_data', {
                code: roomCodeRef.current,
                roomData: { members: newMembers, expenses: newExpenses }
            });
        }
    };

    const leaveServerRoom = () => {
        if (roomCodeRef.current) socketRef.current.emit('leave_room');
        privatePasscodeRef.current = null;
        rejoinCodeRef.current = null;
        setRoom('');
        resetLocal();
    };

    const createRoom = () => {
        leaveServerRoom();
        socketRef.current.emit('create_room');
    };

    const joinRoom = (code) => {
        leaveServerRoom();
        socketRef.current.emit('join_room', code);
    };

    const joinPrivate = (passcode) => {
        leaveServerRoom();
        privatePasscodeRef.current = passcode;
        try { localStorage.setItem(PRIVATE_PASSCODE_KEY, passcode); } catch (err) {}
        socketRef.current.emit('join_private', passcode);
    };

    const leaveRoom = () => {
        leaveServerRoom();
        // Drop ?room= so a refresh doesn't put you straight back in
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    };

    const addMember = (name) => {
        const taken = members.some(m => m.toLowerCase() === name.toLowerCase());
        if (taken) return alert(`${name} is already in the group.`);
        emitStateChange([...members, name], expenses);
    };

    const removeMember = (name) => {
        const updatedMembers = members.filter(m => m !== name);
        const paidFor = expenses.filter(exp => exp.payer === name);
        const newPayer = updatedMembers[0] || '';

        let message = `Remove ${name} from the group?`;
        if (paidFor.length) {
            const list = paidFor.map(exp => exp.title || 'Untitled').join(', ');
            message += newPayer
                ? `\n\n${name} paid for ${paidFor.length} expense(s): ${list}. Those will be marked as paid by ${newPayer}. You can change the payer in the ledger.`
                : `\n\n${name} paid for ${paidFor.length} expense(s): ${list}. Nobody else is left, so those expenses will be deleted.`;
        }
        if (!confirm(message)) return;

        const updatedExpenses = expenses
            .filter(exp => exp.payer !== name || newPayer)
            .map(exp => {
                const payer = exp.payer === name ? newPayer : exp.payer;
                const splitWith = (exp.splitWith || []).filter(m => m !== name);
                if (exp.splitMode !== 'CUSTOM' || !exp.customShares) {
                    return { ...exp, payer, splitWith };
                }
                const { [name]: _removed, ...customShares } = exp.customShares;
                const amount = Object.values(customShares).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                return { ...exp, payer, splitWith, customShares, amount };
            });
        emitStateChange(updatedMembers, updatedExpenses);
    };

    const addExpense = (newExp) => emitStateChange(members, [...expenses, { ...newExp, id: newId() }]);

    const updateExpense = (id, field, value) => {
        const updatedExpenses = expenses.map(exp => exp.id === id ? { ...exp, [field]: value } : exp);
        emitStateChange(members, updatedExpenses);
    };

    const updateCustomShare = (id, memberName, value) => {
        const updatedExpenses = expenses.map(exp => {
            if (exp.id === id) {
                const numVal = parseFloat(value) || 0;
                const updatedShares = { ...exp.customShares, [memberName]: numVal };
                const newTotal = Object.values(updatedShares).reduce((a, b) => a + (parseFloat(b) || 0), 0);
                const activeMembers = Object.keys(updatedShares).filter(m => (parseFloat(updatedShares[m]) || 0) > 0);

                return {
                    ...exp,
                    customShares: updatedShares,
                    splitWith: activeMembers,
                    amount: newTotal
                };
            }
            return exp;
        });
        emitStateChange(members, updatedExpenses);
    };

    const deleteExpense = (id) => {
        const updatedExpenses = expenses.filter(exp => exp.id !== id);
        emitStateChange(members, updatedExpenses);
    };

    const toggleExpenseSplit = (id, memberName) => {
        const updatedExpenses = expenses.map(exp => {
            if (exp.id === id) {
                const exists = exp.splitWith.includes(memberName);
                return {
                    ...exp,
                    splitWith: exists
                        ? exp.splitWith.filter(m => m !== memberName)
                        : [...exp.splitWith, memberName]
                };
            }
            return exp;
        });
        emitStateChange(members, updatedExpenses);
    };

    const isPrivate = roomCode === PRIVATE_CODE;

    return (
        <div className="app">
            <RoomManager
                roomCode={roomCode}
                isPrivate={isPrivate}
                privateEnabled={privateEnabled}
                peopleCount={members.length}
                onCreateRoom={createRoom}
                onJoinRoom={joinRoom}
                onJoinPrivate={joinPrivate}
                onLeaveRoom={leaveRoom}
            />

            <main className="layout">
                <div className="col-side">
                    <MembersManager
                        members={members}
                        onAddMember={addMember}
                        onRemoveMember={removeMember}
                    />
                    <ExpenseForm
                        members={members}
                        onAddExpense={addExpense}
                    />
                </div>

                <div className="col-main">
                    <SummaryTiles expenses={expenses} settlements={settlements} />
                    <DynamicLedger
                        expenses={expenses}
                        members={members}
                        onUpdateExpense={updateExpense}
                        onDeleteExpense={deleteExpense}
                        onToggleSplit={toggleExpenseSplit}
                        onUpdateCustomShare={updateCustomShare}
                    />
                    <SettlementsSummary
                        balances={balances}
                        settlements={settlements}
                        expenses={expenses}
                        roomCode={roomCode}
                        isPrivate={isPrivate}
                    />
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);