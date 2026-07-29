import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PlusCircle, Package, ShoppingCart, BarChart2, PieChart, Clock, AlertTriangle, DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryIcon } from '../lib/categoryIcons';
import { getEstimatedDaysLeft } from '../lib/metrics';
import { DEFAULT_LOW_STOCK_PERCENTAGE } from '../config/constants';

export function Dashboard() {
  const navigate = useNavigate();

  const items = useLiveQuery(() => db.items.toCollection().toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  const activeItems = items?.filter(i => i.status !== 'finished' && i.status !== 'discarded' && i.status !== 'considering') || [];
  const totalItems = activeItems.length;
  const totalValue = activeItems.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);

  const getMonthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  const getYearStart = () => { const d = new Date(); return new Date(d.getFullYear(), 0, 1).getTime(); };

  const categoriesWithBudgets = categories?.filter(c => c.budget) || [];
  const budgetSummaries = categoriesWithBudgets.map(cat => {
    const start = cat.budget!.period === 'monthly' ? getMonthStart() : getYearStart();
    const periodSpend = items?.filter(i => i.categoryId === cat.id && (i.purchaseDate || i.createdAt) >= start && i.status !== 'considering')
      .reduce((sum, item) => sum + (item.purchasePrice || 0), 0) || 0;
    return { cat, periodSpend, budgetAmount: cat.budget!.amount };
  });

  // Alerts
  const alerts = activeItems.map(item => {
    const msgs: string[] = [];
    let isLowStock = false;
    let currentQty: number | undefined;
    let originalQty: number | undefined;

    if (item.groupId && items) {
      const groupItems = items.filter(i => i.groupId === item.groupId);
      originalQty = groupItems.length;
      currentQty = groupItems.filter(i => i.status !== 'finished' && i.status !== 'discarded').length;
    } else if (item.fields['quantity'] !== undefined) {
      currentQty = Number(item.fields['quantity']);
      originalQty = item.originalQuantity !== undefined && item.originalQuantity !== null ? item.originalQuantity : currentQty;
    }

    const daysLeft = getEstimatedDaysLeft(item);
    if (daysLeft !== null) {
      if (daysLeft <= 14) isLowStock = true;
    } else if (currentQty !== undefined && originalQty !== undefined && !isNaN(currentQty) && !isNaN(originalQty)) {
      const threshold = item.lowStockThreshold ?? Math.max(0, Math.floor(originalQty * DEFAULT_LOW_STOCK_PERCENTAGE));
      if (threshold > 0 && currentQty <= threshold && originalQty > 0) isLowStock = true;
    }

    if (isLowStock) msgs.push(daysLeft !== null && daysLeft <= 14 ? `Restock soon (${Math.ceil(daysLeft)}d)` : 'Low Stock');

    const expField = Object.entries(item.fields).find(([k]) => k.toLowerCase().includes('expiration'));
    if (expField && expField[1]) {
      const expDate = new Date(expField[1] as string).getTime();
      if (expDate - Date.now() < 30 * 24 * 60 * 60 * 1000) msgs.push(expDate < Date.now() ? 'Expired' : 'Expiring Soon');
    }
    return msgs.length > 0 ? { item, msgs } : null;
  }).filter((a): a is { item: typeof activeItems[0]; msgs: string[] } => a !== null);

  const lowStockAlerts = alerts.filter(a => a.msgs.some(m => m.includes('Low Stock') || m.includes('Restock')));
  const expiringAlerts = alerts.filter(a => a.msgs.some(m => m.includes('Expir')));

  const recentItems = [...activeItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const statCard = (icon: React.ReactNode, label: string, value: string | number, color: string, onClick?: () => void) => (
    <div
      className="card neu-flat"
      style={{ borderTop: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: '0 0 0.25rem 0' }}>Dashboard</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Welcome back — here's your Stash overview.</p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '1rem' }}>
        <button className="btn btn-primary" onClick={() => navigate('/app/add')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
          <PlusCircle size={20} /> Add Item
        </button>
        <button className="btn neu-convex" onClick={() => navigate('/app/browse')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
          <Package size={20} /> Browse Stash
        </button>
        <button className="btn neu-flat" onClick={() => navigate('/app/shopping-list')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
          <ShoppingCart size={20} /> Shopping List
        </button>
        <button className="btn neu-flat" onClick={() => navigate('/app/insights')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
          <PieChart size={20} /> Insights
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1rem' }}>
        {statCard(<Package size={16} />, 'Total Items', totalItems, 'var(--accent-primary)', () => navigate('/app/browse'))}
        {statCard(<DollarSign size={16} />, 'Total Value', `$${totalValue.toFixed(2)}`, 'var(--accent-success)', () => navigate('/app/insights'))}
        {statCard(<AlertTriangle size={16} />, 'Low Stock', lowStockAlerts.length, lowStockAlerts.length > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)'))}
        {statCard(<Clock size={16} />, 'Expiring Soon', expiringAlerts.length, expiringAlerts.length > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)'))}
      </div>

      {/* Budget Previews */}
      {budgetSummaries.length > 0 && (
        <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-primary)', cursor: 'pointer' }} onClick={() => navigate('/app/insights')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
              <DollarSign size={16} /> Budget Preview
            </h3>
            <ArrowRight size={16} color="var(--text-secondary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {budgetSummaries.slice(0, 4).map(b => (
              <div key={b.cat.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>{getCategoryIcon(b.cat.name, b.cat.icon)} {b.cat.name}</span>
                  <span style={{ color: b.periodSpend > b.budgetAmount ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                    ${b.periodSpend.toFixed(0)} / ${b.budgetAmount}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '4px', background: 'var(--shadow-dark)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', width: `${Math.min(100, (b.periodSpend / b.budgetAmount) * 100)}%`, background: b.periodSpend > b.budgetAmount ? 'var(--accent-danger)' : 'var(--accent-primary)', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
            {budgetSummaries.length > 4 && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>+ {budgetSummaries.length - 4} more budgets</p>}
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>⚠️ Needs Attention</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.slice(0, 5).map(({ item, msgs }) => {
              const cat = categories?.find(c => c.id === item.categoryId);
              return (
                <div key={item.id} className="card neu-flat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.875rem 1rem' }} onClick={() => navigate(`/item/${item.id}`)}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cat ? `${getCategoryIcon(cat.name, cat.icon)} ${cat.name}` : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {msgs.map(m => (
                      <span key={m} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: m.includes('Expir') ? 'var(--accent-danger)' : 'var(--accent-warning)', color: '#fff', whiteSpace: 'nowrap' }}>{m}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {alerts.length > 5 && (
              <button className="btn neu-flat" onClick={() => navigate('/app/browse')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                View all {alerts.length} alerts <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recently Added */}
      {recentItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Recently Added</h2>
            <button className="btn" onClick={() => navigate('/app/browse')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentItems.map(item => {
              const cat = categories?.find(c => c.id === item.categoryId);
              return (
                <div key={item.id} className="card neu-flat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.875rem 1rem' }} onClick={() => navigate(`/item/${item.id}`)}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cat ? `${getCategoryIcon(cat.name, cat.icon)} ${cat.name}` : 'Uncategorized'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>${(item.purchasePrice || 0).toFixed(2)}</p>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderRadius: '6px', background: 'var(--accent-primary)', color: '#fff' }}>{item.status.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items !== undefined && activeItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Package size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.5rem 0' }}>Your Stash is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Start tracking your items to unlock insights, alerts, and more.</p>
          <button className="btn btn-primary" onClick={() => navigate('/app/add')} style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            <PlusCircle size={18} style={{ marginRight: '0.5rem' }} /> Add Your First Item
          </button>
        </div>
      )}
    </div>
  );
}
