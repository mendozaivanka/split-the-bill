function SummaryTiles({ expenses, settlements }) {
    const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return (
        <div className="stat-tiles">
            <div className="stat-tile">
                <span className="label-mono">Total spent</span>
                <span className="stat-value">₱{formatMoney(total)}</span>
            </div>
            <div className="stat-tile">
                <span className="label-mono">Expenses</span>
                <span className="stat-value">{expenses.length}</span>
            </div>
            <div className="stat-tile accent">
                <span className="label-mono">Payments to settle</span>
                <span className="stat-value">{settlements.length}</span>
            </div>
        </div>
    );
}

function buildSummaryText({ balances, settlements, expenses }) {
    let text = `🧾 SPLIT THE BILL\n\n`;

    text += `WHO PAYS WHO\n`;
    if (settlements.length) {
        settlements.forEach(s => { text += `• ${s.from} → ${s.to}: ₱${formatMoney(s.amount)}\n`; });
    } else {
        text += `• Everyone is settled\n`;
    }

    text += `\nBALANCES\n`;
    Object.entries(balances).forEach(([person, amt]) => {
        if (amt > 0.01) text += `• ${person}: gets ₱${formatMoney(amt)}\n`;
        else if (amt < -0.01) text += `• ${person}: owes ₱${formatMoney(-amt)}\n`;
        else text += `• ${person}: settled\n`;
    });

    text += `\nITEMS\n`;
    expenses.forEach((e, i) => {
        text += `${i + 1}. ${e.title || 'Untitled'}: ₱${formatMoney(e.amount)} (paid by ${e.payer})\n`;
        if (e.splitMode === 'CUSTOM' && e.customShares) {
            Object.entries(e.customShares).forEach(([p, amt]) => {
                const num = parseFloat(amt) || 0;
                if (num > 0) text += `   ${p}: ₱${formatMoney(num)}\n`;
            });
        } else {
            const group = e.splitWith || [];
            const each = group.length ? e.amount / group.length : 0;
            text += `   ₱${formatMoney(each)} each × ${group.length}\n`;
        }
    });
    return text;
}

function SettlementsSummary({ balances, settlements, expenses, roomCode, isPrivate }) {
    const [copied, setCopied] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const hasExpenses = expenses.length > 0;

    const copySummary = async () => {
        const text = buildSummaryText({ balances, settlements, expenses });
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Clipboard write error:', err);
            alert('Could not copy automatically. Here is the summary to copy by hand:\n\n' + text);
        }
    };

    const receiptFile = async () => {
        const blob = await makeReceiptImage({ roomCode, isPrivate, expenses, balances, settlements });
        const date = new Date().toISOString().slice(0, 10);
        const name = `split-the-bill-${isPrivate ? 'private' : (roomCode || 'receipt').toLowerCase()}-${date}.png`;
        return new File([blob], name, { type: 'image/png' });
    };

    const download = (file) => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // On phones this opens the share sheet (Messenger, Viber, WhatsApp…); elsewhere it downloads the picture
    const sendReceipt = async () => {
        setBusy(true);
        try {
            const file = await receiptFile();
            const shareData = { files: [file], title: 'Split the Bill receipt', text: 'Here is our bill and who pays who.' };
            if (navigator.canShare && navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    console.error('Share error:', err);
                }
            }
            download(file);
        } catch (err) {
            console.error('Receipt error:', err);
            alert('Could not make the receipt image. Try again, or use Copy summary.');
        } finally {
            setBusy(false);
        }
    };

    const downloadReceipt = async () => {
        setBusy(true);
        try {
            download(await receiptFile());
        } catch (err) {
            console.error('Receipt error:', err);
            alert('Could not make the receipt image. Try again, or use Copy summary.');
        } finally {
            setBusy(false);
        }
    };

    const balanceEntries = Object.entries(balances).sort((a, b) => b[1] - a[1]);

    return (
        <section className="card" aria-labelledby="settle-title">
            <div className="card-header wrap">
                <h2 id="settle-title">Settle up</h2>
                <div className="button-row">
                    <button type="button" onClick={copySummary} className="btn outline" disabled={!hasExpenses}>
                        {copied ? 'Copied' : 'Copy summary'}
                    </button>
                    <button type="button" onClick={downloadReceipt} className="btn outline icon-btn" disabled={!hasExpenses || busy}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
                        Download receipt
                    </button>
                    <button type="button" onClick={sendReceipt} className="btn primary icon-btn" disabled={!hasExpenses || busy}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
                        {busy ? 'Making receipt…' : 'Send receipt'}
                    </button>
                </div>
            </div>

            {!hasExpenses ? (
                <p className="empty-row">Who pays who shows up here once you add an expense.</p>
            ) : (
                <>
                    {settlements.length === 0 ? (
                        <p className="empty-row">Everyone is settled.</p>
                    ) : (
                        <ul className="settle-list">
                            {settlements.map((s, i) => (
                                <li key={i} className="settle-item">
                                    <span className="settle-who"><strong>{s.from}</strong> pays <strong>{s.to}</strong></span>
                                    <span className="settle-amount">₱{formatMoney(s.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="balance-grid">
                        {balanceEntries.map(([person, amt]) => {
                            const gets = amt > 0.01;
                            const owes = amt < -0.01;
                            return (
                                <div key={person} className="balance-cell">
                                    <span className="balance-name">{person}</span>
                                    <span className={`balance-amount ${gets ? 'gets' : owes ? 'owes' : ''}`}>
                                        {gets ? `+₱${formatMoney(amt)}` : owes ? `−₱${formatMoney(-amt)}` : 'settled'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
}
