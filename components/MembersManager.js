function Avatar({ name, members, size }) {
    return (
        <span className={`avatar ${size === 'small' ? 'small' : ''}`} style={{ background: memberTint(members, name) }} aria-hidden="true">
            {initials(name)}
        </span>
    );
}

function MembersManager({ members, onAddMember, onRemoveMember }) {
    const [newMemberName, setNewMemberName] = React.useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        const name = newMemberName.trim();
        if (name) {
            onAddMember(name);
            setNewMemberName('');
        }
    };

    return (
        <section className="card" aria-labelledby="people-title">
            <div className="card-header">
                <h2 id="people-title">People</h2>
                <span className="label-mono">{members.length} in group</span>
            </div>
            {members.length === 0 ? (
                <p className="empty-hint">Add everyone who's splitting, starting with you.</p>
            ) : (
                <ul className="people-list">
                    {members.map(m => (
                        <li key={m} className="person-chip">
                            <Avatar name={m} members={members} />
                            <span className="person-name">{m}</span>
                            <button type="button" className="chip-remove" onClick={() => onRemoveMember(m)} aria-label={`Remove ${m}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <form className="input-group" onSubmit={handleAdd}>
                <label htmlFor="new-person" className="visually-hidden">Add a person</label>
                <input
                    id="new-person"
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Add a name"
                    maxLength={50}
                    autoComplete="off"
                />
                <button type="submit" className="btn secondary">Add</button>
            </form>
        </section>
    );
}
