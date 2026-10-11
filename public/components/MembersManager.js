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
            <h2>Friends</h2>
            <div className="input-group">
                <input 
                    type="text" 
                    value={newMemberName} 
                    onChange={(e) => setNewMemberName(e.target.value)} 
                    onKeyUp={(e) => e.key === 'Enter' && handleAdd()} 
                    placeholder="Enter name (e.g., Ivanka)"
                />
                <button onClick={handleAdd} className="btn primary">Add</button>
            </div>
            <div className="tags-list">
                {members.length === 0 ? (
                    <span className="empty-hint">No friends added yet. Add names above to get started.</span>
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