import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ParsedLineItem } from '../lib/receiptParser';
import type { Category } from '../db';

interface Props {
  onClose: () => void;
  onSave: (items: ParsedLineItem[], globalCategoryId: string) => void;
  initialItems: ParsedLineItem[];
  categories: Category[];
}

export function ReceiptReviewModal({ onClose, onSave, initialItems, categories }: Props) {
  const [items, setItems] = useState<ParsedLineItem[]>(initialItems);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const handleDelete = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  
  const handleUpdate = (id: string, field: 'name' | 'price', value: string) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        if (field === 'price') return { ...i, price: value ? parseFloat(value) : null };
        return { ...i, name: value };
      }
      return i;
    }));
  };

  const handleConfirm = () => {
    if (!selectedCategoryId) return alert('Please select a category for these items.');
    onSave(items, selectedCategoryId);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card neu-convex" style={{ width: '90%', maxWidth: '600px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Review Scanned Receipt</h3>
          <button className="btn neu-pressed" onClick={onClose} style={{ padding: '0.25rem 0.75rem' }}>Cancel</button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Apply Category to All Items *</label>
          <select className="input neu-pressed" value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select Category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Line Items</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px' }}>
              <input 
                className="input neu-pressed" 
                value={item.name} 
                onChange={e => handleUpdate(item.id, 'name', e.target.value)} 
                style={{ flex: 1 }} 
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                $
                <input 
                  type="number" 
                  step="0.01" 
                  className="input neu-pressed" 
                  value={item.price !== null ? item.price : ''} 
                  onChange={e => handleUpdate(item.id, 'price', e.target.value)} 
                  style={{ width: '80px' }} 
                />
              </div>
              <button className="btn" onClick={() => handleDelete(item.id)} style={{ color: 'var(--accent-danger)', padding: '0.5rem' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No items remaining.</p>
          )}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={items.length === 0}>
            Add {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>
  );
}
