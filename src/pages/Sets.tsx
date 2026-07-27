import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export function Sets() {
  const navigate = useNavigate();
  const sets = useLiveQuery(() => db.sets.toArray());
  const [showAdd, setShowAdd] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  const handleAddSet = async () => {
    if (!newSetName.trim()) return;
    const newSetId = uuidv4();
    await db.sets.add({
      id: newSetId,
      name: newSetName.trim(),
      itemIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setNewSetName('');
    setShowAdd(false);
    navigate(`/sets/${newSetId}`);
  };

  const handleDeleteSet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this set?')) {
      await db.sets.delete(id);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={28} /> Sets & Outfits
        </h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Create Set
        </button>
      </div>

      {showAdd && (
        <div className="card neu-flat" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            className="input neu-pressed" 
            placeholder="Set Name (e.g., Gym Outfit, Morning Routine)"
            value={newSetName}
            onChange={e => setNewSetName(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAddSet(); }}
          />
          <button className="btn btn-primary" onClick={handleAddSet}>Save</button>
          <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      {sets && sets.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {sets.map(set => (
            <div 
              key={set.id} 
              className="card neu-flat" 
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              onClick={() => navigate(`/sets/${set.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0 }}>{set.name}</h3>
                <button className="btn" style={{ padding: '0.25rem', color: 'var(--accent-danger)' }} onClick={e => handleDeleteSet(set.id, e)}>
                  <Trash2 size={18} />
                </button>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                {set.itemIds.length} item{set.itemIds.length !== 1 ? 's' : ''} in set
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card neu-flat" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Layers size={48} color="var(--text-secondary)" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
          <h2 style={{ margin: '0 0 1rem 0' }}>No Sets Yet</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 2rem' }}>
            Group multiple items together into logical sets like "Workout Outfit", "Camera Gear", or "Morning Routine" to track their combined cost.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            Create Your First Set
          </button>
        </div>
      )}
    </div>
  );
}
