function ExpenseForm({ members, onAddExpense }) {
    const [splitMode, setSplitMode] = React.useState('EQUAL');
    const [form, setForm] = React.useState({
        title: '',
        amount: '',
        payer: '',
        splitWith: [],
        customShares: {}
    });

    // Keep the form in step with the group: drop people who were removed, include people who were added
    const prevMembersRef = React.useRef(members);
    React.useEffect(() => {
        const previous = prevMembersRef.current;
        prevMembersRef.current = members;
        const added = members.filter(m => !previous.includes(m));
        setForm(prev => {
            const customShares = {};
            Object.entries(prev.customShares).forEach(([person, val]) => {
                if (members.includes(person)) customShares[person] = val;
            });
            const splitWith = prev.splitWith.length
                ? [...prev.splitWith.filter(m => members.includes(m)), ...added.filter(m => !prev.splitWith.includes(m))]
                : [...members];
            return {
                ...prev,
                payer: members.includes(prev.payer) ? prev.payer : (members[0] || ''),
                splitWith,
                customShares
            };
        });
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

    const amountNum = parseFloat(form.amount) || 0;
    const customTotal = Object.values(form.customShares).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    const eachPays = form.splitWith.length ? amountNum / form.splitWith.length : 0;

    return (
        <section className="card" aria-labelledby="new-expense-title">
            <h2 id="new-expense-title">New expense</h2>
            <form className="stack" onSubmit={handleSubmit}>
                <div className="field">
                    <label htmlFor="exp-title" className="label-mono">What was it</label>
                    <input
                        id="exp-title"
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Dinner, Grab, coffee…"
                        required
                    />
                </div>

                <div className="field-row">
                    <div className="field">
                        <label htmlFor="exp-amount" className="label-mono">Amount</label>
                        <div className="money-input">
                            <span aria-hidden="true">₱</span>
                            <input
                                id="exp-amount"
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                                readOnly={splitMode === 'CUSTOM'}
                                required
                            />
                        </div>
                    </div>
                    <div className="field">
                        <label htmlFor="exp-payer" className="label-mono">Paid by</label>
                        <select
                            id="exp-payer"
                            value={form.payer}
                            onChange={(e) => setForm({ ...form, payer: e.target.value })}
                            required
                            disabled={members.length === 0}
                        >
                            {members.length === 0 ? (
                                <option value="">Add a person first</option>
                            ) : (
                                members.map(m => <option key={m} value={m}>{m}</option>)
                            )}
                        </select>
                    </div>
                </div>

                <div className="field">
                    <span className="label-mono" id="split-type-label">Split</span>
                    <div className="segmented" role="group" aria-labelledby="split-type-label">
                        <button
                            type="button"
                            aria-pressed={splitMode === 'EQUAL'}
                            onClick={() => setSplitMode('EQUAL')}
                        >
                            Equally
                        </button>
                        <button
                            type="button"
                            aria-pressed={splitMode === 'CUSTOM'}
                            onClick={() => {
                                setSplitMode('CUSTOM');
                                setForm(prev => ({ ...prev, amount: Object.values(prev.customShares).reduce((a, b) => a + (parseFloat(b) || 0), 0) || '' }));
                            }}
                        >
                            Exact amounts
                        </button>
                    </div>

                    {members.length === 0 ? (
                        <p className="empty-hint">Add people first.</p>
                    ) : splitMode === 'EQUAL' ? (
                        <div className="pill-row" role="group" aria-label="Split between">
                            {members.map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    className="pill"
                                    aria-pressed={form.splitWith.includes(m)}
                                    onClick={() => toggleSplit(m)}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="share-list">
                            {members.map(m => (
                                <div key={m} className="share-row">
                                    <label htmlFor={`share-${m}`}>{m}</label>
                                    <div className="money-input compact">
                                        <span aria-hidden="true">₱</span>
                                        <input
                                            id={`share-${m}`}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={form.customShares[m] || ''}
                                            onChange={(e) => handleCustomShareChange(m, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {members.length > 0 && (
                    splitMode === 'EQUAL' ? (
                        <div className="preview-bar">
                            <span>{form.splitWith.length ? 'Each person pays' : 'Pick at least one person'}</span>
                            {form.splitWith.length > 0 && <span className="mono">₱{formatMoney(eachPays)}</span>}
                        </div>
                    ) : (
                        <div className="preview-bar">
                            <span>Adds up to</span>
                            <span className="mono">₱{formatMoney(customTotal)}</span>
                        </div>
                    )
                )}

                <button type="submit" className="btn dark large full-width" disabled={members.length === 0}>
                    Add expense
                </button>
            </form>
        </section>
    );
}
