import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowLeft, Trash2, Plus, DollarSign } from 'lucide-react';
import { getEstimatedYearlyCost } from '../lib/metrics';

export function SetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const setEntity = useLiveQuery(() => db.sets.get(id!));
  const allItems = useLiveQuery(() => db.items.toArray());
  
  const [showItemSelect, setShowItemSelect] = useState(false);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  if (!setEntity) return <div style={{ padding: '2rem' }}>Loading or Set not found...</div>;

  const handleEditInit = () => {
    setEditName(setEntity.name);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editName.trim()) {
      await db.sets.update(id!, { name: editName.trim(), updatedAt: Date.now() });
    }
    setIsEditing(false);
  };

  const setItems = (allItems || []).filter(i => setEntity.itemIds.some(si => si.itemId === i.id));
  const availableItems = (allItems || []).filter(i => !setEntity.itemIds.some(si => si.itemId === i.id) && i.status !== 'discarded' && i.status !== 'considering');
  const filteredAvailable = availableItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const totalPurchasePrice = setItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const totalYearlyCost = setItems.reduce((sum, item) => sum + (getEstimatedYearlyCost(item) || 0), 0);

  const handleAddItem = async (itemId: string) => {
    const updatedIds = [...setEntity.itemIds, { itemId }];
    await db.sets.update(id!, { itemIds: updatedIds, updatedAt: Date.now() });
    setShowItemSelect(false);
    setSearch('');
  };

  const handleRemoveItem = async (itemId: string) => {
    const updatedIds = setEntity.itemIds.filter(i => i.itemId !== itemId);
    await db.sets.update(id!, { itemIds: updatedIds, updatedAt: Date.now() });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn neu-pressed" onClick={() => navigate('/sets')} style={{ padding: '0.5rem', display: 'flex' }}><ArrowLeft size={20} /></button>
        {isEditing ? (
          <input 
            className="input neu-pressed" 
            value={editName} 
            onChange={e => setEditName(e.target.value)} 
            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); }}
            style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', flex: 1 }} 
            autoFocus 
          />
        ) : (
          <h1 style={{ margin: 0, flex: 1 }}>{setEntity.name}</h1>
        )}
        {isEditing ? (
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
        ) : (
          <button className="btn" onClick={handleEditInit}>Edit Name</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-primary)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <DollarSign size={16} /> Total Set Value
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
            ${totalPurchasePrice.toFixed(2)}
          </p>
        </div>
        
        <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-secondary)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <DollarSign size={16} /> Estimated Yearly Cost
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
            ${totalYearlyCost.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ yr</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Items in Set</h2>
        <button className="btn btn-primary" onClick={() => setShowItemSelect(!showItemSelect)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> Add Item
        </button>
      </div>

      {showItemSelect && (
        <div className="card neu-flat" style={{ marginBottom: '2rem' }}>
          <input 
            type="text" 
            className="input neu-pressed" 
            placeholder="Search inventory to add..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
            autoFocus
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredAvailable.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderRadius: '8px' }} className="neu-pressed">
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.purchasePrice ? `$${item.purchasePrice.toFixed(2)}` : 'Unknown Price'}</div>
                </div>
                <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => handleAddItem(item.id)}>Add</button>
              </div>
            ))}
            {filteredAvailable.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No items found.</p>}
          </div>
        </div>
      )}

      {setItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {setItems.map(item => (
            <div key={item.id} className="card neu-flat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div 
                  style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--shadow-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(`/item/${item.id}`)}
                >
                  {/* Thumbnail placeholder */}
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, cursor: 'pointer' }} onClick={() => navigate(`/item/${item.id}`)}>{item.name}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {item.purchasePrice ? `$${item.purchasePrice.toFixed(2)}` : 'N/A'} • {item.status}
                  </p>
                </div>
              </div>
              <button className="btn" style={{ padding: '0.5rem', color: 'var(--accent-danger)' }} onClick={() => handleRemoveItem(item.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>This set is empty. Add items to see the combined value.</p>
      )}

    </div>
  );
}
