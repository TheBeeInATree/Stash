import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ShoppingCart, Check, Trash2, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryIcon } from '../lib/categoryIcons';

export function ShoppingList() {
  const navigate = useNavigate();
  const allItems = useLiveQuery(() => db.items.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  if (!allItems || !categories) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const shoppingItems = allItems.filter(i => i.status === 'considering');
  const totalCost = shoppingItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);

  const handleMarkPurchased = async (id: string) => {
    // Basic transition, full flow would redirect to edit if needed
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    
    // Check if price is missing, could prompt here but for now just mark unopened
    const now = Date.now();
    const newHistory = [...item.statusHistory, { status: 'unopened' as any, timestamp: now }];
    
    await db.items.update(id, { 
      status: 'unopened', 
      statusHistory: newHistory, 
      updatedAt: now 
    });
  };

  const handleRemove = async (id: string) => {
    if (confirm('Remove this item from your shopping list?')) {
      await db.items.delete(id);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <ShoppingCart size={28} color="var(--accent-primary)" /> Shopping List
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="card neu-pressed" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="var(--text-secondary)" />
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${totalCost.toFixed(2)}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Est. Total</span>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/add')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Add Item
          </button>
        </div>
      </div>

      {shoppingItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Your shopping list is empty. Add items while comparing or from the Add Item page.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {shoppingItems.map(item => {
            const category = categories.find(c => c.id === item.categoryId);
            return (
              <div key={item.id} className="card neu-flat" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', cursor: 'pointer' }} onClick={() => navigate(`/item/${item.id}`)}>{item.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {category?.icon} {category?.name}
                  </p>
                  <p style={{ fontWeight: 'bold', marginTop: '1rem', marginBottom: '1.5rem' }}>
                    {item.purchasePrice !== null ? `$${item.purchasePrice.toFixed(2)}` : 'No price set'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleMarkPurchased(item.id)}
                  >
                    <Check size={16} /> Purchased
                  </button>
                  <button 
                    className="btn" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-danger)' }}
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
