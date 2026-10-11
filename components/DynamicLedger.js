function DynamicLedger({ expenses, members, onUpdateExpense, onDeleteExpense, onToggleSplit, onUpdateCustomShare }) {
    return (
        <section className="card">
            <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="section-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Dynamic Ledger (Editable)
            </h2>
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
                                <button className="btn outline small danger icon-only-btn" onClick={() => onDeleteExpense(exp.id)} title="Delete expense">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>

                            {exp.splitMode === 'CUSTOM' ? (
                                <div className="compact-shares-wrapper">
                                    <span className="split-label">Custom Shares:</span>
                                    <div className="compact-shares-grid">
                                        {members.map(m => (
                                            <div key={m} className="compact-share-chip">
                                                <span className="chip-name">{m}</span>
                                                <div className="chip-input-group">
                                                    <span>₱</span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={exp.customShares[m] || ''}
                                                        onChange={(e) => onUpdateCustomShare(exp.id, m, e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
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