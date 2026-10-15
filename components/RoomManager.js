function RoomManager({ roomCode, isPrivate, privateEnabled, onCreateRoom, onJoinRoom, onJoinPrivate, onLeaveRoom }) {
    const [inputCode, setInputCode] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [passcode, setPasscode] = React.useState(() => {
        try { return localStorage.getItem('privatePasscode') || ''; } catch (err) { return ''; }
    });

    const handleOpenPrivate = () => {
        if (passcode.trim()) onJoinPrivate(passcode.trim());
    };

    const handleJoin = () => {
        if (inputCode.trim()) {
            onJoinRoom(inputCode.trim());
            setInputCode('');
        }
    };

    const handleShare = async () => {
        if (!roomCode) return;

        const shareData = {
            title: 'Split the Bill',
            text: `Join my expense splitting room on Split the Bill! Room Code: ${roomCode}`,
            url: `${window.location.origin}?room=${roomCode}`
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Share error:', err);
            }
        }

        try {
            await navigator.clipboard.writeText(shareData.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Clipboard write error:', err);
            alert(`Room Code: ${roomCode}`);
        }
    };

    return (
        <section className="card room-header-card">
            {!roomCode ? (
                <div className="room-setup-wrapper">
                    <div className="room-action">
                        <h3>Host a New Group</h3>
                        <button onClick={onCreateRoom} className="btn primary full-width icon-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            Create Shared Room Code
                        </button>
                    </div>
                    <div className="room-divider">OR</div>
                    <div className="room-action">
                        <h3>Join Friends' Room</h3>
                        <div className="input-group">
                            <input 
                                type="text" 
                                value={inputCode} 
                                onChange={(e) => setInputCode(e.target.value.toUpperCase())} 
                                onKeyUp={(e) => e.key === 'Enter' && handleJoin()} 
                                placeholder="ENTER 6-DIGIT CODE" 
                                maxLength={6}
                            />
                            <button onClick={handleJoin} className="btn success">Join</button>
                        </div>
                    </div>
                    {privateEnabled && (
                        <>
                            <div className="room-divider">OR</div>
                            <div className="room-action">
                                <h3>Our Private Ledger</h3>
                                <div className="input-group">
                                    <input 
                                        type="password" 
                                        value={passcode} 
                                        onChange={(e) => setPasscode(e.target.value)} 
                                        onKeyUp={(e) => e.key === 'Enter' && handleOpenPrivate()} 
                                        placeholder="PASSCODE" 
                                        autoComplete="current-password"
                                    />
                                    <button onClick={handleOpenPrivate} className="btn primary icon-btn">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        Open
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="active-room-bar">
                    <div className="room-info">
                        <span className="live-badge">
                            <span className="live-dot"></span> {isPrivate ? 'PRIVATE · SAVED' : 'LIVE SESSION'}
                        </span>
                        {isPrivate ? (
                            <>
                                <h2>Our Private Ledger</h2>
                                <span className="sub-hint">Every change is saved automatically. Only people with the passcode can open it.</span>
                            </>
                        ) : (
                            <>
                                <h2>Room Code: <span className="code-highlight">{roomCode}</span></h2>
                                <span className="sub-hint">Share this code with your friends so they can contribute in real-time.</span>
                            </>
                        )}
                    </div>
                    <div className="room-actions-group">
                        {!isPrivate && <button onClick={handleShare} className="btn primary small icon-btn">
                            {copied ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Link Copied!
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                    Share Link
                                </>
                            )}
                        </button>}
                        <button onClick={onLeaveRoom} className="btn outline danger small">Leave Session</button>
                    </div>
                </div>
            )}
        </section>
    );
}