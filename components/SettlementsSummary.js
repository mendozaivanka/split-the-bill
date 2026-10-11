function SettlementsSummary({ balances, settlements, expenses, hasExpenses }) {
    const formatCurrency = (val) => (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const copySummary = () => {
        if (!hasExpenses) return alert('No expenses logged to copy.');

        let text = `📊 SPLIT THE BILL - EXPENSE & SETTLEMENT BREAKDOWN\n`;
        text += `=============================================\n\n`;

        // 1. Itemized Expenses
        text += `📝 ITEMIZED EXPENSES LOG\n`;
        text += `---------------------------------------------\n`;
        expenses.forEach((e, idx) => {
            text += `${idx + 1}. *${e.title}*\n`;
            text += `   • Total: ₱${formatCurrency(e.amount)}\n`;
            text += `   • Paid by: ${e.payer}\n`;

            if (e.splitMode === 'CUSTOM' && e.customShares) {
                const sharesList = Object.entries(e.customShares)
                    .filter(([_, amt]) => parseFloat(amt) > 0)
                    .map(([person, amt]) => `${person}: ₱${formatCurrency(amt)}`)
                    .join(', ');
                text += `   • Custom Share Breakdown: ${sharesList}\n`;
            } else {
                const group = e.splitWith || [];
                const perPerson = group.length ? (e.amount / group.length) : 0;
                text += `   • Equal Split (${group.length} people): ₱${formatCurrency(perPerson)} each (${group.join(', ')})\n`;
            }
            text += `\n`;
        });

        // 2. Net Balances
        text += `⚖️ NET INDIVIDUAL BALANCES\n`;
        text += `---------------------------------------------\n`;
        Object.entries(balances).forEach(([person, amt]) => {
            if (amt > 0.01) {
                text += `   • ${person}: +₱${formatCurrency(amt)} (is owed)\n`;
            } else if (amt < -0.01) {
                text += `   • ${person}: -₱${formatCurrency(Math.abs(amt))} (owes)\n`;
            } else {
                text += `   • ${person}: ₱0.00 (fully settled)\n`;
            }
        });
        text += `\n`;

        // 3. Final Settlement Instructions
        text += `💡 OPTIMIZED SETTLEMENT INSTRUCTIONS\n`;
        text += `---------------------------------------------\n`;
        if (settlements.length) {
            settlements.forEach(s => {
                text += `👉 *${s.from}* pays *${s.to}* ➔ ₱${formatCurrency(s.amount)}\n`;
            });
        } else {
            text += `🎉 Everyone is completely settled up!\n`;
        }

        // Copy to clipboard
        navigator.clipboard.writeText(text);
        alert('Detailed summary copied to clipboard! Ready to paste into group chats.');
    };

    return (
        <section className="card highlight">
            <div className="card-header">
                <h2>Optimized Settlements</h2>
                <button onClick={copySummary} className="btn outline small" disabled={!hasExpenses}>📋 Copy Detailed Summary</button>
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