function ExpenseForm({ members, onAddExpense }) {
    const [splitMode, setSplitMode] = React.useState('EQUAL'); // 'EQUAL' or 'CUSTOM'
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
        const numVal = parseFloat(val) || 0;
        const updatedShares = { ...form.customShares, [person]: val };
        
        // Auto calculate total sum if custom shares mode
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
        if (!form.splitWith.length) return alert('Select at least one person to split with.');

        const totalAmt = parseFloat(form.amount) || 0;
        if (totalAmt <= 0) return alert('Please enter a valid amount.');

        onAddExpense({
            id: Date.now(),
            title: form.title,
            amount: totalAmt,
            payer: form.payer,
            splitMode,
            splitWith: [...form.splitWith],
            customShares: { ...form.customShares }
        });

        // Reset inputs
        setForm(prev => ({
            ...prev,
            title: '',
            amount: '',
            customShares: {}
        }));
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
            <h2>2. Add New Expense</h2>
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
                                <option value="">Add a friend first</option>
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
                                <span className="empty-hint">Add friends above first.</span>
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

                <button type="submit" className="btn success full-width" disabled={members.length === 0}>
                    + Add Expense
                </button>
            </form>
        </section>
    );
}