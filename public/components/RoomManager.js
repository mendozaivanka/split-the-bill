function RoomManager({ roomCode, onCreateRoom, onJoinRoom, onLeaveRoom }) {
    const [inputCode, setInputCode] = React.useState('');

    const handleJoin = () => {
        if (inputCode.trim()) {
            onJoinRoom(inputCode.trim());
            setInputCode('');
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
                    <button onClick={onLeaveRoom} className="btn outline danger">Leave Session</button>
                </div>
            )}
        </section>
    );
}