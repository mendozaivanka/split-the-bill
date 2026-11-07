// Draws the group's bill as a receipt picture (PNG) that people can send in a chat.
// Plain script: exposes window.makeReceiptImage(data) -> Promise<Blob>.
// The picture always uses the light Nordic Rose colours, so it looks the same for whoever receives it.
(function (root) {
    const C = {
        page: '#e9edf1',
        paper: '#ffffff',
        ink: '#18202b',
        muted: '#525c68',
        rule: '#7d8896',
        pink: '#f4b3c6',
        pinkInk: '#3b1626',
        owes: '#8f3a5c',
        gets: '#3f6178',
        wash: '#fbeef2'
    };
    const SANS = "'Manrope Variable', ui-sans-serif, system-ui, sans-serif";
    const MONO = "'Red Hat Mono Variable', ui-monospace, Menlo, monospace";

    const W = 540;          // logical width; drawn at 2x for sharp text
    const SCALE = 2;
    const PAD = 36;          // page margin around the paper
    const IN = 28;           // padding inside the paper
    const money = (v) => '₱' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Shorten text with an ellipsis until it fits
    function fit(ctx, text, maxWidth) {
        text = String(text || '');
        if (ctx.measureText(text).width <= maxWidth) return text;
        while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
        return text + '…';
    }

    function splitDetail(exp) {
        if (exp.splitMode === 'CUSTOM' && exp.customShares) {
            return Object.entries(exp.customShares)
                .filter(([, v]) => (parseFloat(v) || 0) > 0)
                .map(([p, v]) => `${p}\u00a0${(parseFloat(v) || 0).toLocaleString('en-US')}`)
                .join(' · ');
        }
        const group = exp.splitWith || [];
        if (!group.length) return 'not split with anyone (left out of balances)';
        const each = (parseFloat(exp.amount) || 0) / group.length;
        return `÷${group.length} = ${money(each)} each`;
    }

    // Builds a list of draw steps first, so the canvas can be sized to fit exactly
    function wrap(ctx, text, maxWidth) {
        const words = String(text || '').split(' ');
        const lines = [];
        let line = '';
        words.forEach(word => {
            const next = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(next).width > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = next;
            }
        });
        if (line) lines.push(fit(ctx, line, maxWidth));
        return lines;
    }

    function layout(data, measure, contentW) {
        const steps = [];
        let y = 0;
        const add = (h, draw) => { const top = y; steps.push((ctx, x0, w) => draw(ctx, x0, top, w)); y += h; };
        const dashed = () => add(22, (ctx, x, top, w) => {
            ctx.save();
            ctx.strokeStyle = C.rule;
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, top + 11);
            ctx.lineTo(x + w, top + 11);
            ctx.stroke();
            ctx.restore();
        });
        const label = (text) => add(24, (ctx, x, top) => {
            ctx.font = `600 11px ${MONO}`;
            ctx.fillStyle = C.muted;
            ctx.fillText(text.toUpperCase().split('').join(String.fromCharCode(8202)), x, top + 14);
        });
        const row = (left, right, opts = {}) => add(opts.h || 22, (ctx, x, top, w) => {
            ctx.font = opts.font || `500 14px ${MONO}`;
            ctx.fillStyle = opts.color || C.ink;
            const rightW = ctx.measureText(right).width;
            ctx.fillText(fit(ctx, left, w - rightW - 16), x, top + 15);
            ctx.fillStyle = opts.rightColor || opts.color || C.ink;
            ctx.textAlign = 'right';
            ctx.fillText(right, x + w, top + 15);
            ctx.textAlign = 'left';
        });
        // Grey detail text, wrapped onto as many lines as it needs
        const sub = (text) => {
            measure.font = `400 12px ${MONO}`;
            wrap(measure, text, contentW).forEach(line => add(18, (ctx, x, top) => {
                ctx.font = `400 12px ${MONO}`;
                ctx.fillStyle = C.muted;
                ctx.fillText(line, x, top + 12);
            }));
            add(2, () => {});
        };

        // Header: mark, title, room line
        add(118, (ctx, x, top, w) => {
            const cx = x + w / 2;
            const s = 40;
            const mx = cx - s / 2;
            ctx.fillStyle = C.pink;
            roundRect(ctx, mx, top, s, s, 11);
            ctx.fill();
            ctx.strokeStyle = C.pinkInk;
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(mx + 8, top + 24);
            ctx.lineTo(mx + 32, top + 24);
            ctx.stroke();
            ctx.fillStyle = C.pinkInk;
            ctx.beginPath();
            ctx.arc(mx + 25.5, top + 16.5, 3.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.fillStyle = C.ink;
            ctx.font = `800 22px ${SANS}`;
            ctx.fillText(fit(ctx, data.title, w), cx, top + 74);
            ctx.font = `500 11px ${MONO}`;
            ctx.fillStyle = C.muted;
            ctx.fillText(fit(ctx, data.subtitle.toUpperCase(), w), cx, top + 98);
            ctx.textAlign = 'left';
        });
        dashed();

        // Items
        data.expenses.forEach((exp, i) => {
            if (i) add(8, () => {});
            row((exp.title || 'Untitled').toUpperCase(), money(exp.amount), { font: `600 14px ${MONO}` });
            sub(`paid by ${exp.payer || 'nobody'} · ${splitDetail(exp)}`);
        });
        dashed();
        row('TOTAL', money(data.total), { font: `700 19px ${MONO}`, h: 32 });
        dashed();

        // Who pays who: the part people act on, so it is the loudest block
        label('Who pays who');
        if (!data.settlements.length) {
            row('Everyone is settled', '', { font: `600 14px ${SANS}` });
        } else {
            data.settlements.forEach(s => add(46, (ctx, x, top, w) => {
                ctx.fillStyle = C.wash;
                roundRect(ctx, x - 10, top + 3, w + 20, 38, 10);
                ctx.fill();
                ctx.font = `600 15px ${SANS}`;
                ctx.fillStyle = C.ink;
                const amt = money(s.amount);
                ctx.font = `600 16px ${MONO}`;
                const amtW = ctx.measureText(amt).width;
                ctx.font = `600 15px ${SANS}`;
                ctx.fillText(fit(ctx, `${s.from} pays ${s.to}`, w - amtW - 16), x, top + 27);
                ctx.font = `600 16px ${MONO}`;
                ctx.fillStyle = C.owes;
                ctx.textAlign = 'right';
                ctx.fillText(amt, x + w, top + 27);
                ctx.textAlign = 'left';
            }));
        }
        add(6, () => {});
        dashed();

        // Balances
        label('Balances');
        data.balances.forEach(([person, amt]) => {
            const gets = amt > 0.01;
            const owes = amt < -0.01;
            const text = gets ? `gets ${money(amt)}` : owes ? `owes ${money(-amt)}` : 'settled';
            row(person, text, { rightColor: gets ? C.gets : owes ? C.owes : C.muted, font: `500 13px ${MONO}`, h: 21 });
        });
        add(14, () => {});
        add(18, (ctx, x, top, w) => {
            ctx.font = `400 11px ${MONO}`;
            ctx.fillStyle = C.muted;
            ctx.textAlign = 'center';
            ctx.fillText(data.footer, x + w / 2, top + 12);
            ctx.textAlign = 'left';
        });

        return { steps, height: y };
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    async function makeReceiptImage({ roomCode, isPrivate, expenses, balances, settlements }) {
        // Canvas text only uses a web font once it has loaded
        if (document.fonts && document.fonts.load) {
            await Promise.all([
                document.fonts.load(`800 22px 'Manrope Variable'`),
                document.fonts.load(`500 14px 'Red Hat Mono Variable'`)
            ]).catch(() => {});
        }

        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const people = Object.keys(balances).length;
        const data = {
            title: 'Split the Bill',
            subtitle: [isPrivate ? 'Private ledger' : roomCode ? `Room ${roomCode}` : null, date, `${people} ${people === 1 ? 'person' : 'people'}`].filter(Boolean).join(' · '),
            expenses,
            total: expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
            settlements,
            balances: Object.entries(balances).sort((a, b) => b[1] - a[1]),
            footer: 'Made with Split the Bill'
        };

        const paperW = W - PAD * 2;
        const measure = document.createElement('canvas').getContext('2d');
        const { steps, height } = layout(data, measure, paperW - IN * 2);
        const paperH = height + IN * 2;
        const zig = 10;
        const H = PAD + paperH + zig + PAD;

        const canvas = document.createElement('canvas');
        canvas.width = W * SCALE;
        canvas.height = H * SCALE;
        const ctx = canvas.getContext('2d');
        ctx.scale(SCALE, SCALE);
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = C.page;
        ctx.fillRect(0, 0, W, H);

        // Paper with a torn (zigzag) bottom edge
        ctx.fillStyle = C.paper;
        ctx.beginPath();
        ctx.moveTo(PAD, PAD + 14);
        ctx.arcTo(PAD, PAD, PAD + 14, PAD, 14);
        ctx.lineTo(PAD + paperW - 14, PAD);
        ctx.arcTo(PAD + paperW, PAD, PAD + paperW, PAD + 14, 14);
        ctx.lineTo(PAD + paperW, PAD + paperH);
        const teeth = Math.round(paperW / 18);
        const step = paperW / teeth;
        for (let i = teeth; i > 0; i--) {
            ctx.lineTo(PAD + (i - 0.5) * step, PAD + paperH + zig);
            ctx.lineTo(PAD + (i - 1) * step, PAD + paperH);
        }
        ctx.closePath();
        ctx.fill();

        const x0 = PAD + IN;
        const w = paperW - IN * 2;
        ctx.save();
        ctx.translate(0, PAD + IN);
        steps.forEach(draw => draw(ctx, x0, w));
        ctx.restore();

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create the image'))), 'image/png');
        });
    }

    root.makeReceiptImage = makeReceiptImage;
})(window);
