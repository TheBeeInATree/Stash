import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { getEstimatedYearlyCost } from '../lib/metrics';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { useUndo } from '../contexts/UndoContext';

interface DashboardCardProps {
  item: any;
  category: any;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean, shiftKey: boolean) => void;
}

export function DashboardCard({ item, category, isSelected, onSelect }: DashboardCardProps) {
  const navigate = useNavigate();
  const { triggerDelete } = useUndo();
  
  const [editingField, setEditingField] = useState<'price' | 'quantity' | null>(null);
  const [editingValue, setEditingValue] = useState('');
  
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleInlineSave = async () => {
    if (!editingField) return;
    
    if (editingField === 'price') {
      const p = parseFloat(editingValue);
      if (!isNaN(p)) {
        await db.items.update(item.id, { purchasePrice: p, updatedAt: Date.now() });
      }
    } else if (editingField === 'quantity') {
      const p = parseFloat(editingValue);
      if (!isNaN(p)) {
        await db.items.update(item.id, { fields: { ...item.fields, quantity: p }, updatedAt: Date.now() });
      }
    }
    setEditingField(null);
  };

  const advanceStatus = async () => {
    const statuses = ['considering', 'unopened', 'in_use', 'finished'];
    const currentIdx = statuses.indexOf(item.status);
    if (currentIdx !== -1 && currentIdx < statuses.length - 1) {
      const nextStatus = statuses[currentIdx + 1];
      const now = Date.now();
      const newHistory = item.statusHistory.filter((s: any) => s.status !== nextStatus);
      newHistory.push({ status: nextStatus, timestamp: now });
      newHistory.sort((a: any, b: any) => a.timestamp - b.timestamp);
      await db.items.update(item.id, { status: nextStatus, statusHistory: newHistory, updatedAt: now });
    }
  };

  const setStatus = async (nextStatus: string) => {
    const now = Date.now();
    const newHistory = item.statusHistory.filter((s: any) => s.status !== nextStatus);
    newHistory.push({ status: nextStatus, timestamp: now });
    newHistory.sort((a: any, b: any) => a.timestamp - b.timestamp);
    await db.items.update(item.id, { status: nextStatus, statusHistory: newHistory, updatedAt: now });
    setShowContextMenu(false);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => triggerDelete('items', [item], 'Item deleted'),
    onSwipedRight: () => advanceStatus(),
    trackMouse: false
  });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const tooltipText = `Purchase Date: ${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}
Notes: ${item.fields?.notes || 'None'}
Status: ${item.status}`;

  return (
    <>
      <div 
        {...swipeHandlers}
        className={`card neu-flat ${isSelected ? 'neu-convex' : ''}`} 
        style={{ transition: 'all 0.2s', border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent', position: 'relative' }}
        onContextMenu={handleContextMenu}
        title={tooltipText}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={(e) => onSelect(item.id, e.target.checked, (e.nativeEvent as PointerEvent).shiftKey)}
              style={{ marginTop: '0.25rem' }}
            />
            <h3 style={{ margin: 0, cursor: 'pointer' }} onClick={() => navigate(`/item/${item.id}`)}>{item.name}</h3>
          </div>
          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '8px', background: 'var(--accent-primary)', color: '#fff' }}>
            {item.status.replace('_', ' ')}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1.75rem', cursor: 'pointer' }} onClick={() => navigate(`/item/${item.id}`)}>
          {category?.icon} {category?.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem', marginLeft: '1.75rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {editingField === 'price' ? (
              <input 
                className="input neu-pressed" 
                autoFocus
                value={editingValue}
                onChange={e => setEditingValue(e.target.value)}
                onBlur={handleInlineSave}
                onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                style={{ width: '80px', padding: '0.25rem', margin: 0, fontWeight: 'bold', fontSize: '1rem' }}
              />
            ) : (
              <p 
                style={{ fontWeight: 'bold', margin: 0, cursor: 'text' }} 
                onClick={(e) => { e.stopPropagation(); setEditingField('price'); setEditingValue(item.purchasePrice?.toString() || ''); }}
              >
                ${item.purchasePrice !== null && item.purchasePrice !== undefined ? item.purchasePrice.toFixed(2) : '0.00'}
              </p>
            )}
            
            {item.fields && item.fields['quantity'] !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qty:</span>
                {editingField === 'quantity' ? (
                  <input 
                    className="input neu-pressed" 
                    autoFocus
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onBlur={handleInlineSave}
                    onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                    style={{ width: '60px', padding: '0.25rem', margin: 0, fontSize: '0.875rem' }}
                  />
                ) : (
                  <span 
                    style={{ fontWeight: 'bold', margin: 0, cursor: 'text', fontSize: '0.875rem' }} 
                    onClick={(e) => { e.stopPropagation(); setEditingField('quantity'); setEditingValue(item.fields['quantity'].toString()); }}
                  >
                    {item.fields['quantity']}
                  </span>
                )}
              </div>
            )}
          </div>
          {getEstimatedYearlyCost(item) !== null && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>${getEstimatedYearlyCost(item)?.toFixed(2)} <span style={{ fontSize: '0.75rem' }}>/ yr</span></p>
          )}
        </div>
      </div>

      {showContextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowContextMenu(false)} onContextMenu={e => { e.preventDefault(); setShowContextMenu(false); }} />
          <div className="neu-convex" style={{
            position: 'fixed',
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            background: 'var(--bg-color)',
            zIndex: 999,
            padding: '0.5rem',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            minWidth: '150px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <button className="btn" style={{ padding: '0.5rem', textAlign: 'left' }} onClick={() => { navigate(`/item/${item.id}`); setShowContextMenu(false); }}>Edit Full</button>
            <button className="btn" style={{ padding: '0.5rem', textAlign: 'left' }} onClick={() => { navigate('/add', { state: { duplicateFrom: item } }); setShowContextMenu(false); }}>Duplicate</button>
            <div style={{ borderBottom: '1px solid var(--shadow-light)', margin: '0.25rem 0' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>Mark Status:</span>
            <button className="btn" style={{ padding: '0.5rem', textAlign: 'left' }} onClick={() => setStatus('unopened')}>Unopened</button>
            <button className="btn" style={{ padding: '0.5rem', textAlign: 'left' }} onClick={() => setStatus('in_use')}>In Use</button>
            <button className="btn" style={{ padding: '0.5rem', textAlign: 'left' }} onClick={() => setStatus('finished')}>Finished</button>
            <div style={{ borderBottom: '1px solid var(--shadow-light)', margin: '0.25rem 0' }} />
            <button className="btn" style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--accent-danger)' }} onClick={() => { triggerDelete('items', [item], 'Item deleted'); setShowContextMenu(false); }}>Delete</button>
          </div>
        </>
      )}
    </>
  );
}
