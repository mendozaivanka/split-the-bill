function MembersManager({ members, onAddMember, onRemoveMember }) {
    const [newMemberName, setNewMemberName] = React.useState('');

    const handleAdd = () => {
        if (newMemberName.trim()) {
            onAddMember(newMemberName.trim());
            setNewMemberName('');
        }
    };

    return (
        <section className="card">
            <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="section-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Group Members
            </h2>
            <div className="input-group">
                <input 
                    type="text" 
                    value={newMemberName} 
                    onChange={(e) => setNewMemberName(e.target.value)} 
                    onKeyUp={(e) => e.key === 'Enter' && handleAdd()} 
                    placeholder="Enter name (e.g., Ivanka)"
                />
                <button onClick={handleAdd} className="btn primary icon-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add
                </button>
            </div>
            <div className="tags-list">
                {members.length === 0 ? (
                    <span className="empty-hint">No members added yet. Add names above to get started.</span>
                ) : (
                    members.map(m => (
                        <span key={m} className="tag">
                            {m}
                            <span className="remove" onClick={() => onRemoveMember(m)}>&times;</span>
                        </span>
                    ))
                )}
            </div>
        </section>
    );
}