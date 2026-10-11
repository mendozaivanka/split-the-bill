function SettlementsSummary({ balances, settlements, expenses, hasExpenses }) {
    const formatCurrency = (val) => (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const copySummary = () => {
        if (!hasExpenses) return alert('No expenses logged to copy.');

        let text = `📊 *Group Expense Settlement Summary*\n\n`;
        text += `*Expenses Logged:*\n`;
        expenses.forEach(e => {
            text += `• ${e.title}: ₱${formatCurrency(e.amount)} (Paid by ${e.payer})\n`;
        });

        text += `\n*Final Settlement List:*\n`;
        if (settlements.length) {
            settlements.forEach(s => {
                text += `👉 ${s.from} ➔ ${s.to}: ₱${formatCurrency(s.amount)}\n`;
            });
        } else {
            text += ` Everyone is fully settled!\n`;
        }

        navigator.clipboard.writeText(text);
        alert('Summary copied to clipboard!');
    };

    return (
        <section className="card highlight">
            <div className="card-header">
                <h2>Optimized Settlements</h2>
                <button onClick={copySummary} className="btn outline small" disabled={!hasExpenses}>📋 Copy Summary</button>
            </div>

            {/* Net Balances */}
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