// Debt simplification shared by the server (require) and the browser (window.simplifyDebts).
(function (root) {
    function simplifyDebts(expenses) {
        const balances = {};
        const add = (person, amt) => { balances[person] = (balances[person] || 0) + amt; };

        (expenses || []).forEach(exp => {
            if (!exp || !exp.payer) return;
            const payer = exp.payer;

            if (exp.splitMode === 'CUSTOM' && exp.customShares) {
                // The payer is credited only what the shares add up to, so balances always sum to zero
                const shares = Object.entries(exp.customShares)
                    .map(([person, val]) => [person, parseFloat(val) || 0])
                    .filter(([, share]) => share > 0);
                if (!shares.length) return;
                const total = shares.reduce((sum, [, share]) => sum + share, 0);
                add(payer, total);
                shares.forEach(([person, share]) => add(person, -share));
            } else {
                const totalAmount = parseFloat(exp.amount) || 0;
                const group = Array.isArray(exp.splitWith) ? exp.splitWith : [];
                // Nobody to split with: ignore the expense instead of crediting the payer alone
                if (totalAmount <= 0 || !group.length) return;
                add(payer, totalAmount);
                const equalShare = totalAmount / group.length;
                group.forEach(person => add(person, -equalShare));
            }
        });

        const debtors = [];
        const creditors = [];
        Object.keys(balances).forEach(person => {
            const net = balances[person];
            if (net < -0.01) debtors.push({ name: person, amount: -net });
            else if (net > 0.01) creditors.push({ name: person, amount: net });
        });

        const settlements = [];
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const settleAmount = Math.min(debtor.amount, creditor.amount);
            settlements.push({
                from: debtor.name,
                to: creditor.name,
                amount: Math.round(settleAmount * 100) / 100
            });
            debtor.amount -= settleAmount;
            creditor.amount -= settleAmount;
            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return { balances, settlements };
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { simplifyDebts };
    else root.simplifyDebts = simplifyDebts;
})(typeof window !== 'undefined' ? window : this);
