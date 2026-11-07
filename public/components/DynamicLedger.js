// Lets the field be empty or half-typed ("1.") while editing; the number is sent as you type and tidied on blur
function LedgerAmountInput({ id, value, onCommit, readOnly, label }) {
    const [text, setText] = React.useState(String(value ?? ''));
    const focused = React.useRef(false);

    // Take outside changes (other people, custom shares) unless this field is being edited
    React.useEffect(() => {
        if (!focused.current) setText(String(value ?? ''));
    }, [value]);

    return (
        <input
            id={id}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            aria-label={label}
            value={text}
            readOnly={readOnly}
            placeholder="0.00"
            onFocus={() => { focused.current = true; }}
            onChange={(e) => {
                setText(e.target.value);
                const num = parseFloat(e.target.value);
                onCommit(Number.isFinite(num) && num >= 0 ? num : 0);
            }}
            onBlur={() => {
                focused.current = false;
                setText(String(value ?? ''));
            }}
        />
    );
}

function LedgerEditor({ exp, members, onUpdateExpense, onToggleSplit, onUpdateCustomShare }) {
    const isCustom = exp.splitMode === 'CUSTOM';
    const customTotal = Object.values(exp.customShares || {}).reduce((a, b) => a + (parseFloat(b) || 0), 0);
    return (
        <div className="ledger-editor">
            <div className="editor-fields">
                <div className="field">
                    <label className="label-mono" htmlFor={`title-${exp.id}`}>Item</label>
                    <input
                        id={`title-${exp.id}`}
                        type="text"
                        value={exp.title}
                        onChange={(e) => onUpdateExpense(exp.id, 'title', e.target.value)}
                        placeholder="Item name"
                    />
                </div>
                <div className="field">
                    <label className="label-mono" htmlFor={`amount-${exp.id}`}>Amount</label>
                    <div className="money-input">
                        <span aria-hidden="true">₱</span>
                        <LedgerAmountInput
                            id={`amount-${exp.id}`}
                            value={exp.amount}
                            onCommit={(num) => onUpdateExpense(exp.id, 'amount', num)}
                            readOnly={isCustom}
                            label={`Amount for ${exp.title || 'expense'}`}
                        />
                    </div>
                </div>
                <div className="field">
                    <label className="label-mono" htmlFor={`payer-${exp.id}`}>Paid by</label>
                    <select
                        id={`payer-${exp.id}`}
                        value={exp.payer}
                        onChange={(e) => onUpdateExpense(exp.id, 'payer', e.target.value)}
                    >
                        {members.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {isCustom ? (
                <div className="share-chips">
                    {members.map(m => (
                        <label key={m} className="share-chip">
                            <span className="chip-name">{m}</span>
                            <span className="chip-money">
                                <span aria-hidden="true">₱</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    inputMode="decimal"
                                    value={exp.customShares[m] || ''}
                                    onChange={(e) => onUpdateCustomShare(exp.id, m, e.target.value)}
                                    placeholder="0"
                                    aria-label={`${m}'s share of ${exp.title || 'expense'}`}
                                />
                            </span>
                        </label>
                    ))}
                    <span className="adds-up">Adds up to ₱{formatMoney(customTotal)}</span>
                </div>
            ) : (
                <div className="pill-row" role="group" aria-label={`Split ${exp.title || 'expense'} between`}>
                    {members.map(m => (
                        <button
                            key={m}
                            type="button"
                            className="pill"
                            aria-pressed={(exp.splitWith || []).includes(m)}
                            onClick={() => onToggleSplit(exp.id, m)}
                        >
                            {m}
                        </button>
                    ))}
                    {!(exp.splitWith || []).length && <span className="warn-text">Nobody is ticked, so this expense is left out of the balances.</span>}
                </div>
            )}
        </div>
    );
}

function DynamicLedger({ expenses, members, onUpdateExpense, onDeleteExpense, onToggleSplit, onUpdateCustomShare }) {
    const [openId, setOpenId] = React.useState(null);

    return (
        <section className="card" aria-labelledby="ledger-title">
            <div className="card-header">
                <h2 id="ledger-title">Ledger</h2>
                {expenses.length > 0 && <span className="muted small-text">Click a row to edit</span>}
            </div>
            {expenses.length === 0 ? (
                <p className="empty-row">No expenses yet. Add one on the left.</p>
            ) : (
                <div className="table-scroll">
                    <table className="ledger-table">
                        <thead>
                            <tr>
                                <th scope="col">Item</th>
                                <th scope="col">Paid by</th>
                                <th scope="col">Split</th>
                                <th scope="col" className="num">Amount</th>
                                <th scope="col"><span className="visually-hidden">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(exp => {
                                const open = openId === exp.id;
                                const empty = exp.splitMode !== 'CUSTOM' && !(exp.splitWith || []).length;
                                return (
                                    <React.Fragment key={exp.id}>
                                        <tr className={`ledger-row ${open ? 'open' : ''}`} onClick={() => setOpenId(open ? null : exp.id)}>
                                            <td className="item-cell">
                                                <button
                                                    type="button"
                                                    className="row-toggle"
                                                    aria-expanded={open}
                                                    onClick={(e) => { e.stopPropagation(); setOpenId(open ? null : exp.id); }}
                                                >
                                                    {exp.title || 'Untitled'}
                                                </button>
                                            </td>
                                            <td>{exp.payer || '—'}</td>
                                            <td>
                                                <span className={`split-tag ${exp.splitMode === 'CUSTOM' ? 'exact' : ''} ${empty ? 'empty' : ''}`}>
                                                    {empty ? 'Nobody' : splitLabel(exp)}
                                                </span>
                                            </td>
                                            <td className="num mono strong">₱{formatMoney(exp.amount)}</td>
                                            <td className="actions-cell">
                                                <button
                                                    type="button"
                                                    className="icon-btn-ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Delete "${exp.title || 'Untitled'}"?`)) onDeleteExpense(exp.id);
                                                    }}
                                                    aria-label={`Delete ${exp.title || 'expense'}`}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                        {open && (
                                            <tr className="editor-row">
                                                <td colSpan="5">
                                                    <LedgerEditor
                                                        exp={exp}
                                                        members={members}
                                                        onUpdateExpense={onUpdateExpense}
                                                        onToggleSplit={onToggleSplit}
                                                        onUpdateCustomShare={onUpdateCustomShare}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
