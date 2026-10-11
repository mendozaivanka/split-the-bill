function DynamicLedger({ expenses, members, onUpdateExpense, onDeleteExpense, onToggleSplit, onUpdateCustomShare }) {
    return (
        <section className="card">
            <h2>Ledger</h2>
            <div className="expenses-list">
                {expenses.length === 0 ? (
                    <p className="empty-row">No expenses logged yet. Fill out the form on the left to add items.</p>
                ) : (
                    expenses.map((exp) => (
                        <div key={exp.id} className="dynamic-expense-card">
                            <div className="expense-row-main">
                                <input 
                                    type="text" 
                                    className="edit-input item-name"
                                    value={exp.title} 
                                    onChange={(e) => onUpdateExpense(exp.id, 'title', e.target.value)}
                                    placeholder="Item Name"
                                />
                                <div className="amount-input-wrapper">
                                    <span>₱</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="edit-input amount-val"
                                        value={exp.amount} 
                                        onChange={(e) => onUpdateExpense(exp.id, 'amount', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        readOnly={exp.splitMode === 'CUSTOM'}
                                    />
                                </div>
                                <select 
                                    className="edit-select payer-select"
                                    value={exp.payer} 
                                    onChange={(e) => onUpdateExpense(exp.id, 'payer', e.target.value)}
                                >
                                    {members.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <button className="btn outline small danger" onClick={() => onDeleteExpense(exp.id)}>🗑️</button>
                            </div>

                            {exp.splitMode === 'CUSTOM' ? (
                                <div className="custom-shares-inline">
                                    <div className="split-label">Custom Shares:</div>
                                    <div className="shares-grid-inline">
                                        {members.map(m => (
                                            <div key={m} className="share-pill-input">
                                                <label>{m}:</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={exp.customShares[m] || 0}
                                                    onChange={(e) => onUpdateCustomShare(exp.id, m, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="split-pills">
                                    <span className="split-label">Split Equal:</span>
                                    {members.map(m => (
                                        <button 
                                            key={m} 
                                            type="button"
                                            className={`pill-btn ${exp.splitWith.includes(m) ? 'active' : ''}`}
                                            onClick={() => onToggleSplit(exp.id, m)}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}