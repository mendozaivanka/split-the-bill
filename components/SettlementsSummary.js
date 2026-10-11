function SettlementsSummary({ balances, settlements, expenses, hasExpenses }) {
    const formatCurrency = (val) => (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const copySummary = () => {
        if (!hasExpenses) return alert('No expenses logged to copy.');

        let text = `┌──────────────────────────┐\n`;
        text += `│    🧾 SPLIT THE BILL     │\n`;
        text += `└──────────────────────────┘\n\n`;

        // 1. Who Pays Who (Top Priority)
        text += `📌 WHO PAYS WHO\n`;
        if (settlements.length) {
            settlements.forEach(s => {
                text += `💸 ${s.from} ➔ ${s.to} = ₱${formatCurrency(s.amount)}\n`;
            });
        } else {
            text += `💸 All accounts settled! 🎉\n`;
        }
        text += `\n`;

        // 2. Individual Net Balances
        text += `⚖️ *NET BALANCES*\n`;
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

        // 3. Itemized Expenses & Prorated Share Breakdown
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
        alert('Summary copied to clipboard! Ready to paste into group chats.');
    };

    return (
        <section className="card highlight">
            <div className="card-header">
                <h2>Optimized Settlements</h2>
                <button onClick={copySummary} className="btn outline small" disabled={!hasExpenses}>📋 Copy Summary</button>
            </div>

            {/* Net Balances Display */}
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

            {/* Settlement List */}
            <div className="settlements-list">
                {!hasExpenses ? (
                    <p className="empty-row">No settlements required yet.</p>
                ) : settlements.length === 0 ? (
                    <p className="empty-row">All debts are fully settled! 🎉</p>
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