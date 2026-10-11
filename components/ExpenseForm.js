function ExpenseForm({ members, onAddExpense }) {
    const [splitMode, setSplitMode] = React.useState('EQUAL');
    const [form, setForm] = React.useState({
        title: '',
        amount: '',
        payer: '',
        splitWith: [],
        customShares: {}
    });

    React.useEffect(() => {
        setForm(prev => ({
            ...prev,
            payer: prev.payer || members[0] || '',
            splitWith: prev.splitWith.length ? prev.splitWith : [...members]
        }));
    }, [members]);

    const handleCustomShareChange = (person, val) => {
        const updatedShares = { ...form.customShares, [person]: val };
        const newTotal = Object.values(updatedShares).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);

        setForm({
            ...form,
            customShares: updatedShares,
            amount: splitMode === 'CUSTOM' ? newTotal : form.amount
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.payer) return alert('Select who paid for this expense.');

        let totalAmt = 0;
        let customSharesClean = {};
        let activeMembers = [];

        if (splitMode === 'CUSTOM') {
            Object.entries(form.customShares).forEach(([person, val]) => {
                const num = parseFloat(val) || 0;
                if (num > 0) {
                    customSharesClean[person] = num;
                    activeMembers.push(person);
                    totalAmt += num;
                }
            });

            if (activeMembers.length === 0) {
                return alert('Please enter at least one custom share amount.');
            }
        } else {
            totalAmt = parseFloat(form.amount) || 0;
            activeMembers = [...form.splitWith];
            if (!activeMembers.length) return alert('Select at least one person to split with.');
        }

        if (totalAmt <= 0) return alert('Please enter a valid amount.');

        onAddExpense({
            id: Date.now(),
            title: form.title,
            amount: totalAmt,
            payer: form.payer,
            splitMode,
            splitWith: activeMembers,
            customShares: customSharesClean
        });

        setForm({
            title: '',
            amount: '',
            payer: members[0] || '',
            splitWith: [...members],
            customShares: {}
        });
    };

    const toggleSplit = (memberName) => {
        setForm(prev => {
            const exists = prev.splitWith.includes(memberName);
            const updated = exists 
                ? prev.splitWith.filter(m => m !== memberName) 
                : [...prev.splitWith, memberName];
            return { ...prev, splitWith: updated };
        });
    };

    return (
        <section className="card">
            <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="section-icon"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v12"/></svg>
                Add New Expense
            </h2>
            <form onSubmit={handleSubmit}>
                <div className="form-field">
                    <label>Description / Item</label>
                    <input 
                        type="text" 
                        value={form.title} 
                        onChange={(e) => setForm({ ...form, title: e.target.value })} 
                        placeholder="e.g. Dinner, Grab, Coffee" 
                        required 
                    />
                </div>

                <div className="form-field">
                    <label>Split Type</label>
                    <div className="mode-toggle-group">
                        <button 
                            type="button" 
                            className={`toggle-btn ${splitMode === 'EQUAL' ? 'active' : ''}`}
                            onClick={() => setSplitMode('EQUAL')}
                        >
                            Equal Split
                        </button>
                        <button 
                            type="button" 
                            className={`toggle-btn ${splitMode === 'CUSTOM' ? 'active' : ''}`}
                            onClick={() => setSplitMode('CUSTOM')}
                        >
                            Custom Share Amounts
                        </button>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Total Amount (₱)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={form.amount} 
                            onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                            placeholder="0.00" 
                            readOnly={splitMode === 'CUSTOM'}
                            required 
                        />
                    </div>
                    <div className="form-field">
                        <label>Paid By</label>
                        <select 
                            value={form.payer} 
                            onChange={(e) => setForm({ ...form, payer: e.target.value })} 
                            required
                            disabled={members.length === 0}
                        >
                            {members.length === 0 ? (
                                <option value="">Add a member first</option>
                            ) : (
                                members.map(m => <option key={m} value={m}>{m}</option>)
                            )}
                        </select>
                    </div>
                </div>

                {splitMode === 'EQUAL' ? (
                    <div className="form-field">
                        <label>Split Among</label>
                        <div className="checkbox-grid">
                            {members.length === 0 ? (
                                <span className="empty-hint">Add group members above first.</span>
                            ) : (
                                members.map(m => (
                                    <label key={m} className="checkbox-item">
                                        <input 
                                            type="checkbox" 
                                            checked={form.splitWith.includes(m)} 
                                            onChange={() => toggleSplit(m)} 
                                        /> {m}
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="form-field">
                        <label>Exact Amount Per Person (₱)</label>
                        <div className="custom-shares-list">
                            {members.map(m => (
                                <div key={m} className="custom-share-row">
                                    <span>{m}</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.customShares[m] || ''}
                                        onChange={(e) => handleCustomShareChange(m, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button type="submit" className="btn success full-width icon-btn" disabled={members.length === 0}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Expense
                </button>
            </form>
        </section>
    );
}