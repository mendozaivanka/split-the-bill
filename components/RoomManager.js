function RoomManager({ roomCode, onCreateRoom, onJoinRoom, onLeaveRoom }) {
    const [inputCode, setInputCode] = React.useState('');
    const [copied, setCopied] = React.useState(false);

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

        // Try native Web Share API (mobile devices, macOS Safari, Chrome share sheet)
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                // Ignore AbortError if user cancels share sheet
                if (err.name !== 'AbortError') console.error('Share error:', err);
            }
        }

        // Fallback: Copy room link / code to clipboard
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
                        <button onClick={onCreateRoom} className="btn primary full-width">🎮 Create Shared Room Code</button>
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
                </div>
            ) : (
                <div className="active-room-bar">
                    <div className="room-info">
                        <span className="live-badge">🔴 LIVE SESSION</span>
                        <h2>Room Code: <span className="code-highlight">{roomCode}</span></h2>
                        <span className="sub-hint">Share this code with your friends so they can contribute in real-time.</span>
                    </div>
                    <div className="room-actions-group">
                        <button onClick={handleShare} className="btn primary small">
                            {copied ? '✅ Link Copied!' : '🔗 Share / Copy Link'}
                        </button>
                        <button onClick={onLeaveRoom} className="btn outline danger small">Leave Session</button>
                    </div>
                </div>
            )}
        </section>
    );
}