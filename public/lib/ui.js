// Small display helpers shared by the components (plain script, loaded before them).
(function (root) {
    // Nordic Rose tints, one per person in the order they joined
    const TINTS = ['var(--rosas-2)', 'var(--fjord)', 'var(--moss)', 'var(--heather)', 'var(--sand)'];

    function memberTint(members, name) {
        const i = Math.max(0, members.indexOf(name));
        return TINTS[i % TINTS.length];
    }

    function initials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function formatMoney(val) {
        return (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // One line describing how an expense is split, e.g. "Equal · 4" or "Exact"
    function splitLabel(exp) {
        if (exp.splitMode === 'CUSTOM') return 'Exact';
        return `Equal · ${(exp.splitWith || []).length}`;
    }

    root.memberTint = memberTint;
    root.initials = initials;
    root.formatMoney = formatMoney;
    root.splitLabel = splitLabel;
})(window);
