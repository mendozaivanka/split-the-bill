const { useState, useEffect, useRef } = React;

function App() {
    const [roomCode, setRoomCode] = useState('');
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});
    const [settlements, setSettlements] = useState([]);
    
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(window.location.origin);

        socketRef.current.on('room_created', ({ code, roomData }) => {
            setRoomCode(code);
            setMembers(roomData.members || []);
            setExpenses(roomData.expenses || []);
        });

        socketRef.current.on('room_joined', ({ code, roomData }) => {
            setRoomCode(code);
            setMembers(roomData.members || []);
            setExpenses(roomData.expenses || []);
        });

        socketRef.current.on('room_data_updated', (roomData) => {
            setMembers(roomData.members || []);
            setExpenses(roomData.expenses || []);
        });

        socketRef.current.on('error_message', (msg) => {
            alert(msg);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('room');
        if (codeFromUrl) {
            joinRoom(codeFromUrl);
        }

        return () => socketRef.current.disconnect();
    }, []);

    useEffect(() => {
        calculateSettlements();
    }, [expenses]);

    const emitStateChange = (newMembers, newExpenses) => {
        setMembers(newMembers);
        setExpenses(newExpenses);

        if (roomCode) {
            socketRef.current.emit('update_room_data', {
                code: roomCode,
                roomData: { members: newMembers, expenses: newExpenses }
            });
        }
    };

    const calculateSettlements = async () => {
        if (!expenses.length) {
            setBalances({});
            setSettlements([]);
            return;
        }

        try {
            const res = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expenses })
            });
            const data = await res.json();
            setBalances(data.balances || {});
            setSettlements(data.settlements || []);
        } catch (err) {
            console.error('Calculation error:', err);
        }
    };

    const createRoom = () => {
        setMembers([]);
        setExpenses([]);
        setBalances({});
        setSettlements([]);
        socketRef.current.emit('create_room');
    };

    const joinRoom = (code) => {
        setMembers([]);
        setExpenses([]);
        setBalances({});
        setSettlements([]);
        socketRef.current.emit('join_room', code);
    };

    const leaveRoom = () => {
        setRoomCode('');
        setMembers([]);
        setExpenses([]);
        setBalances({});
        setSettlements([]);
    };

    const addMember = (name) => {
        if (!members.includes(name)) {
            emitStateChange([...members, name], expenses);
        }
    };

    const removeMember = (name) => {
        const updatedMembers = members.filter(m => m !== name);
        const updatedExpenses = expenses.map(exp => ({
            ...exp,
            payer: exp.payer === name ? (updatedMembers[0] || '') : exp.payer,
            splitWith: exp.splitWith.filter(m => m !== name)
        }));
        emitStateChange(updatedMembers, updatedExpenses);
    };

    const addExpense = (newExp) => emitStateChange(members, [...expenses, newExp]);

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

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>💸 Split the Bill</h1>
                <p>Settle your expenses in seconds</p>
            </header>

            <RoomManager 
                roomCode={roomCode}
                onCreateRoom={createRoom}
                onJoinRoom={joinRoom}
                onLeaveRoom={leaveRoom}
            />

            <div className="grid-layout">
                <div className="column">
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

                <div className="column">
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
                        hasExpenses={expenses.length > 0} 
                    />
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);