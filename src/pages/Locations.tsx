import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Location } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit2, Trash2, Save, MapPin } from 'lucide-react';

export function getFullLocationPath(locations: Location[], locId: string | null): string {
  if (!locId) return 'Unassigned';
  let current = locations.find(l => l.id === locId);
  if (!current) return 'Unknown Location';
  const path = [];
  while (current) {
    path.unshift(current.name);
    current = locations.find(l => l.id === current!.parentLocationId);
  }
  return path.join(' > ');
}

export function Locations() {
  const locations = useLiveQuery(() => db.locations.toArray());
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [parentLocationId, setParentLocationId] = useState<string>('');
  
  // Safe deletion state
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');

  if (!locations) return <div style={{ padding: '2rem' }}>Loading Locations...</div>;

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setName(loc.name);
    setParentLocationId(loc.parentLocationId || '');
    setIsEditing(true);
  };

  const handleNewLocation = () => {
    setSelectedLocation(null);
    setName('');
    setParentLocationId('');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name) return alert('Location name is required');
    const now = Date.now();
    const parentId = parentLocationId || null;

    if (parentId && selectedLocation && (parentId === selectedLocation.id)) {
      return alert('A location cannot be its own parent.');
    }

    if (selectedLocation) {
      await db.locations.update(selectedLocation.id, {
        name,
        parentLocationId: parentId,
        updatedAt: now
      });
    } else {
      await db.locations.add({
        id: uuidv4(),
        name,
        parentLocationId: parentId,
        createdAt: now,
        updatedAt: now
      });
    }
    setIsEditing(false);
  };

  const triggerDelete = async (loc: Location) => {
    const children = locations.filter(l => l.parentLocationId === loc.id);
    const items = await db.items.where('locationId').equals(loc.id).toArray();
    
    if (children.length > 0 || items.length > 0) {
      setDeletingLocation(loc);
      setReassignTargetId('');
    } else {
      if (confirm(`Are you sure you want to delete "${loc.name}"?`)) {
        await db.locations.delete(loc.id);
        setIsEditing(false);
      }
    }
  };

  const handleConfirmDeleteWithReassign = async () => {
    if (!deletingLocation) return;
    const target = reassignTargetId || null;
    
    const children = locations.filter(l => l.parentLocationId === deletingLocation.id);
    for (const child of children) {
      await db.locations.update(child.id, { parentLocationId: target });
    }

    const items = await db.items.where('locationId').equals(deletingLocation.id).toArray();
    for (const item of items) {
      await db.items.update(item.id, { locationId: target });
    }

    await db.locations.delete(deletingLocation.id);
    setDeletingLocation(null);
    setIsEditing(false);
  };

  return (
    <div>
      <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Locations
        {!isEditing && (
          <button className="btn btn-primary" onClick={handleNewLocation} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> New Location
          </button>
        )}
      </h1>

      {deletingLocation ? (
        <div className="card neu-flat" style={{ border: '2px solid var(--accent-danger)' }}>
          <h2 style={{ margin: '0 0 1rem 0', color: 'var(--accent-danger)' }}>Delete Location: {deletingLocation.name}</h2>
          <p>This location contains items or sub-locations. Please choose a new location to reassign them to, or leave blank to unassign them entirely.</p>
          
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Reassign to:</label>
          <select 
            className="input neu-pressed" 
            style={{ width: '100%', marginBottom: '1.5rem' }}
            value={reassignTargetId}
            onChange={e => setReassignTargetId(e.target.value)}
          >
            <option value="">(None - Unassign items)</option>
            {locations.filter(l => l.id !== deletingLocation.id && l.parentLocationId !== deletingLocation.id).map(l => (
              <option key={l.id} value={l.id}>{getFullLocationPath(locations, l.id)}</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" style={{ backgroundColor: 'var(--accent-danger)' }} onClick={handleConfirmDeleteWithReassign}>
              Confirm Delete & Reassign
            </button>
            <button className="btn" onClick={() => setDeletingLocation(null)}>Cancel</button>
          </div>
        </div>
      ) : !isEditing ? (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {locations.filter(l => !l.parentLocationId).length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No locations added yet.
            </div>
          ) : (
            locations
              .filter(l => !l.parentLocationId)
              .map(rootLoc => {
                const renderNode = (loc: Location, isRoot: boolean = false) => {
                  const children = locations.filter(l => l.parentLocationId === loc.id);
                  return (
                    <div key={loc.id} style={{ marginTop: isRoot ? '2rem' : '0.75rem' }}>
                      <div 
                        className="card neu-flat" 
                        style={{ cursor: 'pointer', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '350px' }} 
                        onClick={() => handleSelectLocation(loc)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <MapPin size={18} color="var(--accent-primary)" />
                          <span style={{ fontWeight: 600 }}>{loc.name}</span>
                        </div>
                        <Edit2 size={16} color="var(--text-secondary)" />
                      </div>
                      {children.length > 0 && (
                        <div style={{ borderLeft: '2px solid var(--shadow-dark)', paddingLeft: '1rem', marginLeft: '1rem', marginTop: '0.5rem' }}>
                          {children.map(child => renderNode(child, false))}
                        </div>
                      )}
                    </div>
                  );
                };
                return renderNode(rootLoc, true);
              })
          )}
        </div>
      ) : (
        <div className="card neu-flat" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Location Name</label>
              <input className="input neu-pressed" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pantry" style={{ width: '100%' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Parent Location (Optional)</label>
              <select className="input neu-pressed" value={parentLocationId} onChange={e => setParentLocationId(e.target.value)} style={{ width: '100%' }}>
                <option value="">None (Top Level)</option>
                {locations.filter(l => l.id !== selectedLocation?.id).map(l => (
                  <option key={l.id} value={l.id}>{getFullLocationPath(locations, l.id)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Save Location
              </button>
              {selectedLocation && (
                <button className="btn" onClick={() => triggerDelete(selectedLocation)} style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trash2 size={18} /> Delete Location
                </button>
              )}
              <button className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
