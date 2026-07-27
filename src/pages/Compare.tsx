import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item, type Category, type Formula } from '../db';
import { evaluateFormula } from '../lib/evaluator';
import { AlertCircle, Plus, X, Search, Trash2 } from 'lucide-react';

export function Compare() {
  const categories = useLiveQuery(() => db.categories.toArray());
  const allItems = useLiveQuery(() => db.items.toArray());
  const allFormulas = useLiveQuery(() => db.formulas.toArray());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const category = categories?.find(c => c.id === selectedCategoryId);
  const itemsInCategory = allItems?.filter(i => i.categoryId === selectedCategoryId) || [];
  const formulas = allFormulas?.filter(f => f.categoryId === selectedCategoryId) || [];
  
  const compareItems = itemsInCategory.filter(i => selectedItemIds.includes(i.id));
  
  const availableItems = (selectedCategoryId
    ? itemsInCategory.filter(i => !selectedItemIds.includes(i.id) && i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : (allItems || []).filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())))
    .filter(i => i.status !== 'considering');

  const displayItems = availableItems.slice(0, 50);

  const handleSelect = (item: Item) => {
    if (!selectedCategoryId) {
      setSelectedCategoryId(item.categoryId);
      setSelectedItemIds([item.id]);
    } else {
      setSelectedItemIds([...selectedItemIds, item.id]);
    }
    setSearchTerm('');
  };

  const clearComparison = () => {
    setSelectedCategoryId('');
    setSelectedItemIds([]);
    setSearchTerm('');
  };

  const removeItem = (id: string) => {
    setSelectedItemIds(selectedItemIds.filter(i => i !== id));
  };

  const getVariables = (item: Item) => {
    const usageCount = item.statusHistory.filter(s => s.status === 'in_use').length || 1;
    let lifespanYears = 1;
    
    if (item.manualLifespanDays !== undefined) {
      lifespanYears = Math.max(0.01, item.manualLifespanDays / 365);
    } else {
      const inUse = item.statusHistory.find(s => s.status === 'in_use');
      if (inUse) {
        const finished = item.statusHistory.find(s => s.status === 'finished');
        const endTimestamp = finished ? finished.timestamp : Date.now();
        lifespanYears = Math.max(0.01, (endTimestamp - inUse.timestamp) / (1000 * 60 * 60 * 24 * 365));
      } else {
        const finished = item.statusHistory.find(s => s.status === 'finished');
        if (finished) {
          const start = item.purchaseDate ? new Date(item.purchaseDate).getTime() : item.createdAt;
          lifespanYears = Math.max(0.01, (finished.timestamp - start) / (1000 * 60 * 60 * 24 * 365));
        }
      }
    }
    
    return {
      ...item.fields,
      purchasePrice: item.purchasePrice || 0,
      price: item.purchasePrice || 0,
      itemCost: item.purchasePrice || 0,
      cost: item.purchasePrice || 0,
      usageCount,
      uses: usageCount,
      lifespanYears,
      lifespan: lifespanYears
    };
  };

  const getLoggedVariables = (item: Item, baseVars: any) => {
    if (!item.trackUsage || !item.usageLog || item.usageLog.length === 0) return null;
    const totalQuantity = item.usageLog.reduce((sum, log) => sum + (log.quantityUsed || 0), 0);
    const loggedUses = totalQuantity > 0 ? totalQuantity : item.usageLog.length;
    return { ...baseVars, usageCount: loggedUses, uses: loggedUses };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Compare Items</h1>
        {selectedCategoryId && (
          <button className="btn neu-pressed" onClick={clearComparison} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
            <Trash2 size={16} /> Start Over
          </button>
        )}
      </div>
      
      <div className="card neu-flat" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          {selectedCategoryId ? `Add another ${category?.name} item to compare` : 'Search for any item to start comparing'}
        </h3>
        
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input 
            type="text" 
            className="input neu-pressed" 
            placeholder={selectedCategoryId ? "Search remaining items..." : "Type an item name..."}
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ width: '100%', paddingLeft: '3.5rem' }} 
            autoFocus
          />
        </div>
        
        {(searchTerm || !selectedCategoryId) && (
          <div style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {displayItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '1rem 0' }}>No items found</p>
            ) : (
              displayItems.map(i => {
                const itemCategory = categories?.find(c => c.id === i.categoryId);
                return (
                  <div 
                    key={i.id}
                    onClick={() => handleSelect(i)}
                    className="neu-convex"
                    style={{ 
                      padding: '0.75rem 1rem', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderRadius: '8px',
                      transition: 'transform 0.1s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ textTransform: 'capitalize' }}>{i.status.replace('_', ' ')}</span>
                        {!selectedCategoryId && itemCategory && (
                          <>
                            <span>•</span>
                            <span>{itemCategory.icon} {itemCategory.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button className="btn" style={{ padding: '0.4rem', borderRadius: '50%' }}>
                      <Plus size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {!selectedCategoryId && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }} className="neu-flat card">
          <AlertCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Items Selected</h2>
          <p style={{ margin: 0 }}>Search for an item above to automatically start comparing it.</p>
        </div>
      )}

      {compareItems.length > 0 && category && (
        <div style={{ overflowX: 'auto', background: 'var(--bg-color)', borderRadius: '12px', padding: '1rem' }} className="neu-convex">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '2px solid var(--shadow-dark)' }}>Property</th>
                {compareItems.map(item => (
                  <th key={item.id} style={{ padding: '1rem', borderBottom: '2px solid var(--shadow-dark)', minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {item.name}
                      <button className="btn neu-pressed" style={{ padding: '0.25rem', color: 'var(--accent-danger)', display: 'flex' }} onClick={() => removeItem(item.id)}>
                        <X size={16} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)', fontWeight: 600 }}>Status</td>
                {compareItems.map(item => <td key={item.id} style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)' }}>{item.status.replace('_', ' ')}</td>)}
              </tr>
              <tr>
                <td style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)', fontWeight: 600 }}>Purchase Price</td>
                {compareItems.map(item => <td key={item.id} style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)' }}>{item.purchasePrice ? `$${item.purchasePrice.toFixed(2)}` : '-'}</td>)}
              </tr>
              {category.fieldTemplate.map(field => (
                <tr key={field.name}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)', fontWeight: 600 }}>{field.name}</td>
                  {compareItems.map(item => <td key={item.id} style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)' }}>{item.fields[field.name]?.toString() || '-'}</td>)}
                </tr>
              ))}
              {formulas.length > 0 && (
                <tr>
                  <td colSpan={compareItems.length + 1} style={{ padding: '1rem', background: 'var(--shadow-light)', fontWeight: 'bold' }}>
                    Calculated Metrics
                  </td>
                </tr>
              )}
              {formulas.map(f => (
                <tr key={f.id}>
                  <td style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)', fontWeight: 600, color: 'var(--accent-primary)' }}>{f.name}</td>
                  {compareItems.map(item => {
                    const vars = getVariables(item);
                    const estVal = evaluateFormula(f.expression, vars);
                    
                    const loggedVars = getLoggedVariables(item, vars);
                    let loggedVal = null;
                    if (loggedVars) {
                      loggedVal = evaluateFormula(f.expression, loggedVars);
                    }

                    const showDual = loggedVal !== null && loggedVal !== estVal;

                    return (
                      <td key={item.id} style={{ padding: '1rem', borderBottom: '1px solid var(--shadow-light)' }}>
                        {showDual ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est:</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{estVal !== null ? (Number.isInteger(estVal) ? estVal : estVal.toFixed(2)) : 'Err'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Log:</span>
                              <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{loggedVal !== null ? (Number.isInteger(loggedVal) ? loggedVal : loggedVal.toFixed(2)) : 'Err'}</span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                            {estVal !== null ? (Number.isInteger(estVal) ? estVal : estVal.toFixed(2)) : 'Err'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {compareItems.length === 0 && selectedCategoryId && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto', opacity: 0.5 }} />
          <p>Add items above to compare them side-by-side.</p>
        </div>
      )}
    </div>
  );
}
