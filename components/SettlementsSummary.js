function SettlementsSummary({ balances, settlements, expenses, hasExpenses }) {
    const [copied, setCopied] = React.useState(false);
    const formatCurrency = (val) => (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const copySummary = () => {
        if (!hasExpenses) return alert('No expenses logged to copy.');

        let text = `🧾 SPLIT THE BILL\n`;

        text += `📌 *WHO PAYS WHO*\n`;
        if (settlements.length) {
            settlements.forEach(s => {
                text += `👉 ${s.from} ➔ ${s.to} = ₱${formatCurrency(s.amount)}\n`;
            });
        } else {
            text += `👉 All accounts settled!\n`;
        }
        text += `\n`;

        text += `⚖️ NET BALANCES\n`;
        Object.entries(balances).forEach(([person, amt]) => {
            if (amt > 0.01) {
                text += `  • ${person}: +₱${formatCurrency(amt)} (gets back)\n`;
            } else if (amt < -0.01) {
                text += `  • ${person}: -₱${formatCurrency(Math.abs(amt))} (owes)\n`;
            } else {
                text += `  • ${person}: ₱0.00 (settled)\n`;
            }
        });
        text += `\n`;

        text += `📊 SUMMARY PER ITEM\n`;
        expenses.forEach((e, i) => {
            text += `[${i + 1}] ${e.title} — ₱${formatCurrency(e.amount)} (Paid by ${e.payer})\n`;
            
            if (e.splitMode === 'CUSTOM' && e.customShares) {
                Object.entries(e.customShares).forEach(([p, amt]) => {
                    const numAmt = parseFloat(amt) || 0;
                    if (numAmt > 0) {
                        text += `    ▪ ${p}: ₱${formatCurrency(numAmt)}\n`;
                    }
                });
            } else {
                const group = e.splitWith || [];
                const perPerson = group.length ? (e.amount / group.length) : 0;
                text += `    ▪ Equal Split: ₱${formatCurrency(perPerson)} × ${group.length} members\n`;
            }
        });

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <section className="card highlight">
            <div className="card-header">
                <h2>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="section-icon"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    Optimized Settlements
                </h2>
                <button onClick={copySummary} className="btn outline small icon-btn" disabled={!hasExpenses}>
                    {copied ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Copied
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copy Summary
                        </>
                    )}
                </button>
            </div>

            <div className="balances-grid">
                {Object.keys(balances).length === 0 ? (
                    <p className="empty-row">Balances will update automatically once expenses are added.</p>
                ) : (
                    Object.entries(balances).map(([person, amt]) => {
                        const isPos = amt > 0.01;
                        const isNeg = amt < -0.01;
                        const cls = isPos ? 'positive' : isNeg ? 'negative' : '';
                        const prefix = isPos ? '+' : '';
                        return (
                            <div key={person} className="balance-card">
                                <div className="name">{person}</div>
                                <div className={`amount ${cls}`}>{prefix}₱{formatCurrency(Math.abs(amt))}</div>
                            </div>
                        );
                    })
                )}
            </div>

            <hr className="divider" />

            <div className="settlements-list">
                {!hasExpenses ? (
                    <p className="empty-row">No settlements required yet.</p>
                ) : settlements.length === 0 ? (
                    <p className="empty-row">All debts are fully settled!</p>
                ) : (
                    settlements.map((s, i) => (
                        <div key={i} className="settlement-item">
                            <span><strong>{s.from}</strong> pays <strong>{s.to}</strong></span>
                            <span className="pay-amount">₱{formatCurrency(s.amount)}</span>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}