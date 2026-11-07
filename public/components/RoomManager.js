// The Nordic Rose mark: a pink rounded square with a horizon line and a small sun
function RoseMark({ size = 30 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
            <rect x="2" y="2" width="48" height="48" rx="14" fill="var(--primary)" />
            <line x1="12" y1="31" x2="40" y2="31" stroke="var(--primary-foreground)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="33" cy="22" r="4.5" fill="var(--primary-foreground)" />
        </svg>
    );
}

// Top bar (always shown) plus the start card when you are not in a room yet
function RoomManager({ roomCode, isPrivate, privateEnabled, peopleCount, onCreateRoom, onJoinRoom, onJoinPrivate, onLeaveRoom }) {
    const [inputCode, setInputCode] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [passcode, setPasscode] = React.useState(() => {
        try { return localStorage.getItem('privatePasscode') || ''; } catch (err) { return ''; }
    });

    const handleOpenPrivate = (e) => {
        e.preventDefault();
        if (passcode.trim()) onJoinPrivate(passcode.trim());
    };

    const handleJoin = (e) => {
        e.preventDefault();
        if (inputCode.trim()) {
            onJoinRoom(inputCode.trim());
            setInputCode('');
        }
    };

    const handleShare = async () => {
        if (!roomCode) return;
        const shareData = {
            title: 'Split the Bill',
            text: `Join my Split the Bill room. Code: ${roomCode}`,
            url: `${window.location.origin}?room=${roomCode}`
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Share error:', err);
            }
        }

        try {
            await navigator.clipboard.writeText(shareData.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Clipboard write error:', err);
            alert(`Room code: ${roomCode}\n${shareData.url}`);
        }
    };

    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="brand">
                        <RoseMark />
                        <span className="brand-name">Split the Bill</span>
                    </div>
                    {roomCode && (
                        <div className="topbar-actions">
                            <span className="status-pill">
                                <span className="status-dot" aria-hidden="true"></span>
                                <span className="label-mono">{isPrivate ? 'Private · saved' : `Live · ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`}</span>
                            </span>
                            {isPrivate ? (
                                <span className="room-code">PRIVATE</span>
                            ) : (
                                <span className="room-code" aria-label={`Room code ${roomCode}`}>{roomCode}</span>
                            )}
                            {!isPrivate && (
                                <button type="button" onClick={handleShare} className="btn primary icon-btn">
                                    {copied ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                                    )}
                                    {copied ? 'Link copied' : 'Copy invite link'}
                                </button>
                            )}
                            <button type="button" onClick={onLeaveRoom} className="btn outline">Leave</button>
                        </div>
                    )}
                </div>
                <span className="horizon-sun" aria-hidden="true"></span>
            </header>

            {!roomCode && (
                <section className="card start-card" aria-labelledby="start-title">
                    <div className="start-intro">
                        <h1 id="start-title">Split a bill with your group.</h1>
                        <p>Start a room and share the link. Everyone adds what they paid, and the app works out the fewest payments to settle up.</p>
                    </div>
                    <div className="start-actions">
                        <div className="start-action">
                            <span className="label-mono">New group</span>
                            <button type="button" onClick={onCreateRoom} className="btn primary large full-width">Start a room</button>
                        </div>
                        <form className="start-action" onSubmit={handleJoin}>
                            <label className="label-mono" htmlFor="join-code">Have a code?</label>
                            <div className="input-group">
                                <input
                                    id="join-code"
                                    type="text"
                                    className="code-input"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    placeholder="K7Q2MD"
                                    maxLength={6}
                                    autoComplete="off"
                                />
                                <button type="submit" className="btn dark">Join</button>
                            </div>
                        </form>
                        {privateEnabled && (
                            <form className="start-action" onSubmit={handleOpenPrivate}>
                                <label className="label-mono" htmlFor="private-pass">Our private ledger</label>
                                <div className="input-group">
                                    <input
                                        id="private-pass"
                                        type="password"
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        placeholder="Passcode"
                                        autoComplete="current-password"
                                    />
                                    <button type="submit" className="btn secondary">Open</button>
                                </div>
                            </form>
                        )}
                    </div>
                    <p className="start-note">You can also add people and expenses below without a room. They just won't sync.</p>
                </section>
            )}
        </>
    );
}
