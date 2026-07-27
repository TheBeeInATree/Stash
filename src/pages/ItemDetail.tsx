import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type StatusEntry } from '../db';
import { ArrowLeft, Trash2, Edit2, Save, X, TrendingUp, Clock, Copy } from 'lucide-react';
import { evaluateFormula } from '../lib/evaluator';
import { getFullLocationPath } from './Locations';
import { getEstimatedYearlyCost, getUsageRateInfo } from '../lib/metrics';
import { DateInput } from '../components/DateInput';
import { v4 as uuidv4 } from 'uuid';
import { useUndo } from '../contexts/UndoContext';

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAdvancedHistory, setShowAdvancedHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'details'|'audit'>('details');

  const item = useLiveQuery(() => db.items.get(id!));
  const category = useLiveQuery(() => item ? db.categories.get(item.categoryId) : undefined, [item]);
  const formulas = useLiveQuery(() => item ? db.formulas.where('categoryId').equals(item.categoryId).toArray() : [], [item]);
  const allItems = useLiveQuery(() => db.items.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());

  const linkedItems = allItems ? allItems.filter(i => item?.productLinkId && i.productLinkId === item.productLinkId) : [];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editLocationId, setEditLocationId] = useState<string>('');
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [editTrackUsage, setEditTrackUsage] = useState(false);
  const [editOriginalQuantity, setEditOriginalQuantity] = useState('');
  const [editLowStockThreshold, setEditLowStockThreshold] = useState('');

  const hasQuantityField = category?.fieldTemplate.some(f => ['weight', 'volume', 'count'].includes(f.type));
  const [logQuantity, setLogQuantity] = useState('');

  React.useEffect(() => {
    if (item && !isEditing) {
      setEditName(item.name);
      setEditPurchasePrice(item.purchasePrice ? item.purchasePrice.toString() : '');
      if (item.purchaseDate) {
        const dt = new Date(item.purchaseDate);
        setEditPurchaseDate(new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
      } else {
        setEditPurchaseDate('');
      }
      setEditTags(item.tags ? item.tags.join(', ') : '');
      setEditLocationId(item.locationId || '');
      setEditFields({ ...item.fields });
      setEditTrackUsage(!!item.trackUsage);
      setEditOriginalQuantity(item.originalQuantity !== undefined && item.originalQuantity !== null ? item.originalQuantity.toString() : '');
      setEditLowStockThreshold(item.lowStockThreshold !== undefined && item.lowStockThreshold !== null ? item.lowStockThreshold.toString() : '');
    }
  }, [item, isEditing]);

  const priceDataPoints = React.useMemo(() => {
    if (!item) return [];
    const points: { date: number; price: number; type: 'purchase' | 'edit'; sourceId: string }[] = [];
    
    const itemsToProcess = item.productLinkId ? linkedItems : [item];
    
    itemsToProcess.forEach(i => {
      if (i.purchasePrice !== null) {
        points.push({
          date: i.purchaseDate || i.createdAt,
          price: i.purchasePrice,
          type: 'purchase',
          sourceId: i.id
        });
      }
      if (i.priceEditLog) {
        i.priceEditLog.forEach(log => {
          points.push({
            date: log.timestamp,
            price: log.newPrice,
            type: 'edit',
            sourceId: i.id
          });
        });
      }
    });

    return points.sort((a, b) => a.date - b.date);
  }, [item, linkedItems]);

  if (!item) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const getUsageCount = () => {
    return item.statusHistory.filter(s => s.status === 'in_use').length || 1;
  };
  
  const getLifespanYears = () => {
    if (item.manualLifespanDays !== undefined) {
      return Math.max(0.01, item.manualLifespanDays / 365);
    }
    
    let lifespanYears = 1;
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
    return lifespanYears;
  };

  const formulaVariables = {
    ...item.fields,
    purchasePrice: item.purchasePrice || 0,
    price: item.purchasePrice || 0,
    itemCost: item.purchasePrice || 0,
    cost: item.purchasePrice || 0,
    usageCount: getUsageCount(),
    uses: getUsageCount(),
    lifespanYears: getLifespanYears(),
    lifespan: getLifespanYears()
  };

  const handleStatusChange = async (newStatus: StatusEntry['status']) => {
    const now = Date.now();
    // Remove existing entries of the same status to prevent duplicates, then append and sort
    const newHistory = item.statusHistory.filter(s => s.status !== newStatus);
    newHistory.push({ status: newStatus, timestamp: now });
    newHistory.sort((a, b) => a.timestamp - b.timestamp);

    await db.items.update(item.id, {
      status: newStatus,
      statusHistory: newHistory,
      updatedAt: now
    });
  };

  const { triggerDelete } = useUndo();

  const handleDelete = async () => {
    if (item) {
      triggerDelete('items', [item], 'Item deleted');
      navigate(-1);
    }
  };

  const handleSaveEdits = async () => {
    if (!editName) return alert('Name is required');

    const parsedPrice = editPurchasePrice ? parseFloat(editPurchasePrice) : null;
    let newPriceEditLog = item.priceEditLog ? [...item.priceEditLog] : [];
    
    // Log price change if it was modified
    if (parsedPrice !== item.purchasePrice) {
      newPriceEditLog.push({
        oldPrice: item.purchasePrice || 0,
        newPrice: parsedPrice || 0,
        timestamp: Date.now()
      });
    }

    const [yyyy, mm, dd] = editPurchaseDate.split('-');
    const parsedDate = editPurchaseDate ? new Date(Number(yyyy), Number(mm)-1, Number(dd)).getTime() : null;
    const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const parsedOriginalQuantity = editOriginalQuantity ? parseFloat(editOriginalQuantity) : null;
    const parsedLowStock = editLowStockThreshold ? parseFloat(editLowStockThreshold) : null;

    const now = Date.now();
    let newAuditLog = item.auditLog ? [...item.auditLog] : [];

    const checkAndLog = (field: string, oldVal: any, newVal: any) => {
      // simple equality check
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        newAuditLog.push({ timestamp: now, field, oldValue: oldVal, newValue: newVal });
      }
    };

    checkAndLog('name', item.name, editName);
    checkAndLog('purchasePrice', item.purchasePrice, parsedPrice);
    checkAndLog('purchaseDate', item.purchaseDate, parsedDate);
    checkAndLog('tags', item.tags, tagsArray);
    checkAndLog('locationId', item.locationId, editLocationId || null);
    checkAndLog('fields', item.fields, editFields);
    checkAndLog('trackUsage', item.trackUsage, editTrackUsage);
    checkAndLog('originalQuantity', item.originalQuantity, parsedOriginalQuantity);
    checkAndLog('lowStockThreshold', item.lowStockThreshold, parsedLowStock);

    let updates: any = {
      name: editName,
      purchasePrice: parsedPrice,
      purchaseDate: parsedDate,
      tags: tagsArray,
      locationId: editLocationId || null,
      fields: editFields,
      priceEditLog: newPriceEditLog,
      trackUsage: editTrackUsage,
      originalQuantity: parsedOriginalQuantity,
      lowStockThreshold: parsedLowStock,
      auditLog: newAuditLog,
      updatedAt: now
    };
    if (editTrackUsage && !item.trackUsage) {
      updates.usageLog = item.usageLog || [];
    }

    await db.items.update(item.id, updates);
    setIsEditing(false);
  };

  const handleRestore = async () => {
    if (!item) return;
    const now = Date.now();
    const newHistory = [...item.statusHistory, { status: 'unopened' as any, timestamp: now }];
    await db.items.update(item.id, { status: 'unopened', statusHistory: newHistory, updatedAt: now });
  };

  const handleLogUse = async () => {
    if (!item) return;
    const qty = logQuantity ? parseFloat(logQuantity) : null;
    const newLog = [...(item.usageLog || []), { timestamp: Date.now(), quantityUsed: qty }];
    await db.items.update(item.id, { usageLog: newLog, updatedAt: Date.now() });
    setLogQuantity('');
  };

  const getLifespanString = () => {
    if (item.manualLifespanDays !== undefined) {
      return `${item.manualLifespanDays} days (Manual)`;
    }
    const inUse = item.statusHistory.find(s => s.status === 'in_use');
    if (inUse) {
      const finished = item.statusHistory.find(s => s.status === 'finished');
      const endTimestamp = finished ? finished.timestamp : Date.now();
      const diffMs = Math.max(0, endTimestamp - inUse.timestamp);
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (finished) {
        return days === 0 ? 'Less than a day' : `${days} days`;
      } else {
        return days === 0 ? 'Started today' : `${days} days (Ongoing)`;
      }
    } else {
      const finished = item.statusHistory.find(s => s.status === 'finished');
      if (finished) {
        const start = item.purchaseDate ? new Date(item.purchaseDate).getTime() : item.createdAt;
        const diffMs = Math.max(0, finished.timestamp - start);
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return days === 0 ? 'Less than a day' : `${days} days`;
      }
    }
    return 'N/A';
  };

  const showChart = priceDataPoints.length > 0 && (item?.productLinkId || item?.priceEditLog?.length);
  
  let minPrice = 0, maxPrice = 0, avgPrice = 0, latestPrice = 0;
  let chartPts: {x: number, y: number}[] = [];
  
  if (showChart) {
    const prices = priceDataPoints.map(p => p.price);
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
    avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    latestPrice = priceDataPoints[priceDataPoints.length - 1].price;
    
    const chartWidth = 400;
    const chartHeight = 120;
    const padding = 20;
    
    const timeSpan = priceDataPoints[priceDataPoints.length - 1].date - priceDataPoints[0].date;
    const priceSpan = maxPrice - minPrice || 1; // prevent div by zero
    
    chartPts = priceDataPoints.map((p, i) => {
      const x = priceDataPoints.length === 1 ? chartWidth / 2 : padding + (timeSpan === 0 ? chartWidth / 2 : ((p.date - priceDataPoints[0].date) / timeSpan) * (chartWidth - padding * 2));
      const y = chartHeight - padding - ((p.price - minPrice) / priceSpan) * (chartHeight - padding * 2);
      return {x, y};
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn neu-pressed" onClick={() => navigate(-1)} style={{ padding: '0.5rem', display: 'flex' }}><ArrowLeft size={20} /></button>
        {isEditing ? (
          <input className="input neu-pressed" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEdits(); }} style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.25rem 0.5rem', flex: 1 }} />
        ) : (
          <h1 style={{ margin: 0 }}>{item.name}</h1>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {isEditing ? (
            <>
              <button className="btn neu-pressed" onClick={() => setIsEditing(false)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><X size={20} /> Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdits} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><Save size={20} /> Save</button>
            </>
          ) : (
            <>
              {(item.status === 'finished' || item.status === 'discarded') && (
                <button className="btn btn-primary" onClick={handleRestore} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Restore to Active
                </button>
              )}
              <button className="btn" onClick={() => navigate('/add', { state: { duplicateFrom: item } })} style={{ color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }} title="Duplicate"><Copy size={20} /></button>
              <button className="btn" onClick={() => setIsEditing(true)} style={{ color: 'var(--text-secondary)', display: 'flex' }}><Edit2 size={20} /></button>
              <button className="btn" onClick={handleDelete} style={{ color: 'var(--accent-danger)', display: 'flex' }}><Trash2 size={20} /></button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--shadow-light)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('details')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.125rem', padding: '0.5rem 1rem', cursor: 'pointer',
            borderBottom: activeTab === 'details' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'details' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'details' ? 'bold' : 'normal'
          }}
        >
          Details
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          style={{ 
            background: 'none', border: 'none', fontSize: '1.125rem', padding: '0.5rem 1rem', cursor: 'pointer',
            borderBottom: activeTab === 'audit' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'audit' ? 'bold' : 'normal'
          }}
        >
          Audit Log
        </button>
      </div>

      {activeTab === 'details' ? (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <div className="card neu-flat">
            <h2 style={{ marginTop: 0 }}>Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Category</p>
                <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{category?.name || 'Loading...'}</p>
              </div>
              <div>
                {isEditing ? (
                  <select className="input neu-pressed" value={editLocationId} onChange={e => setEditLocationId(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }}>
                    <option value="">Unassigned</option>
                    {locations?.map(l => (
                      <option key={l.id} value={l.id}>{getFullLocationPath(locations, l.id)}</option>
                    ))}
                  </select>
                ) : (
                  <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{getFullLocationPath(locations || [], item.locationId || null)}</p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Purchase Date</p>
                {isEditing ? (
                  <DateInput className="input neu-pressed" value={editPurchaseDate} onChange={setEditPurchaseDate} style={{ marginTop: '0.25rem' }} />
                ) : (
                  <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Purchase Price</p>
                {isEditing ? (
                  <input type="number" step="0.01" className="input neu-pressed" defaultValue={editPurchasePrice} onBlur={e => setEditPurchasePrice(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }} />
                ) : (
                  <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{item.purchasePrice ? `$${item.purchasePrice.toFixed(2)}` : 'N/A'}</p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Est. Yearly Cost</p>
                <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{getEstimatedYearlyCost(item) !== null ? `$${getEstimatedYearlyCost(item)?.toFixed(2)} / yr` : 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Tags</p>
                {isEditing ? (
                  <input type="text" className="input neu-pressed" defaultValue={editTags} onBlur={e => setEditTags(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }} />
                ) : (
                  <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{item.tags?.join(', ') || 'None'}</p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Original Quantity</p>
                {isEditing ? (
                  <input type="number" className="input neu-pressed" defaultValue={editOriginalQuantity} onBlur={e => setEditOriginalQuantity(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }} placeholder="e.g. 1" />
                ) : (
                  <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{item.originalQuantity ?? 'N/A'}</p>
                )}
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>Low Stock Alert At</p>
                {isEditing ? (
                  <input type="number" className="input neu-pressed" defaultValue={editLowStockThreshold} onBlur={e => setEditLowStockThreshold(e.target.value)} style={{ width: '100%', marginTop: '0.25rem' }} placeholder="Default (20%)" />
                ) : (
                  <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{item.lowStockThreshold !== undefined && item.lowStockThreshold !== null ? item.lowStockThreshold : 'Default (20%)'}</p>
                )}
              </div>
            </div>

            <h3 style={{ marginTop: '2.5rem' }}>Custom Fields</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {category?.fieldTemplate.map(field => {
                const val = item.fields[field.name];
                return (
                  <div key={field.name}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>{field.name}</p>
                    {isEditing ? (
                      field.type === 'dropdown' ? (
                        <select className="input neu-pressed" value={editFields[field.name] || ''} onChange={e => setEditFields({ ...editFields, [field.name]: e.target.value })} style={{ width: '100%', marginTop: '0.25rem' }}>
                          <option value="">Select...</option>
                          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : field.type === 'boolean' ? (
                        <input type="checkbox" checked={!!editFields[field.name]} onChange={e => setEditFields({ ...editFields, [field.name]: e.target.checked })} style={{ marginTop: '0.5rem' }} />
                      ) : field.type === 'date' ? (
                        <DateInput 
                          className="input neu-pressed" 
                          value={editFields[field.name] || ''} 
                          onChange={val => setEditFields({ ...editFields, [field.name]: val })} 
                          style={{ marginTop: '0.25rem' }}
                        />
                      ) : (
                        <input 
                          type={field.type === 'number' || field.type === 'currency' || field.type === 'weight' || field.type === 'volume' || field.type === 'count' ? 'number' : 'text'}
                          className="input neu-pressed" 
                          defaultValue={editFields[field.name] || ''} 
                          onBlur={e => setEditFields({ ...editFields, [field.name]: e.target.value })} 
                          style={{ width: '100%', marginTop: '0.25rem' }}
                        />
                      )
                    ) : (
                      <p style={{ fontWeight: 600, margin: '0.25rem 0' }}>{val?.toString() || 'N/A'}</p>
                    )}
                  </div>
                );
              })}
              {!category?.fieldTemplate.length && !isEditing && (
                <p style={{ color: 'var(--text-secondary)' }}>No custom fields added.</p>
              )}
            </div>

            {isEditing && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--shadow-light)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input type="checkbox" checked={editTrackUsage} onChange={e => setEditTrackUsage(e.target.checked)} />
                  Track individual uses
                </label>
                <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Enables logging each time you use this item, allowing for actual cost-per-use tracking.
                </p>
              </div>
            )}
          </div>

          {item.trackUsage && !isEditing && (
            <div className="card neu-flat" style={{ marginTop: '1.5rem' }}>
              <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} color="var(--accent-primary)" /> Usage Log
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {hasQuantityField && (
                  <input 
                    type="number" 
                    step="any"
                    className="input neu-pressed" 
                    placeholder="Quantity (optional)" 
                    value={logQuantity} 
                    onChange={e => setLogQuantity(e.target.value)} 
                    style={{ width: '150px' }}
                  />
                )}
                <button className="btn btn-primary" onClick={handleLogUse}>Log a use</button>
              </div>
              
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--shadow-light)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Uses Logged</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{item.usageLog?.length || 0}</div>
                </div>
                {hasQuantityField && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Quantity Consumed</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                      {item.usageLog?.reduce((sum, log) => sum + (log.quantityUsed || 0), 0) || 0}
                    </div>
                  </div>
                )}
              </div>
              
              {(() => {
                const rateInfo = getUsageRateInfo(item);
                if (!rateInfo) return null;
                
                return (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--accent-primary)' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--accent-primary)' }}>Restock Prediction</h3>
                    {rateInfo.type === 'quantity' ? (
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>
                          Based on your last {item.usageLog!.length} uses, you consume an average of <strong>{rateInfo.ratePerDay.toFixed(2)} units per day</strong>.
                        </p>
                        {rateInfo.daysLeft > 0 ? (
                          <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold' }}>
                            Estimated {Math.ceil(rateInfo.daysLeft)} days left before empty.
                          </p>
                        ) : (
                          <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold', color: 'var(--accent-danger)' }}>
                            Estimated empty!
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>
                          Based on your last {rateInfo.uses} uses, you use this item on average every <strong>{rateInfo.daysBetweenUses.toFixed(1)} days</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {item.usageLog && item.usageLog.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...item.usageLog].reverse().map((log, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-color)', borderRadius: '8px' }} className="neu-pressed">
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{new Date(log.timestamp).toLocaleString()}</span>
                        {log.quantityUsed !== null && log.quantityUsed !== undefined && (
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--accent-primary)' }}>{log.quantityUsed} used</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No uses logged yet. Log your first use above!</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card neu-flat">
            <h2 style={{ marginTop: 0 }}>Lifecycle</h2>
            <select className="input neu-pressed" value={item.status} onChange={e => handleStatusChange(e.target.value as any)} style={{ marginBottom: '1.5rem', width: '100%' }}>
              <option value="considering">Considering</option>
              <option value="unopened">Unopened</option>
              <option value="in_use">In Use</option>
              <option value="finished">Finished</option>
              <option value="discarded">Discarded</option>
            </select>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Calculated Lifespan</p>
            <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{getLifespanString()}</p>
            
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--shadow-light)' }}>
              <button 
                className="btn" 
                onClick={() => setShowAdvancedHistory(!showAdvancedHistory)} 
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', background: 'transparent', boxShadow: 'none', color: 'var(--text-secondary)' }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Advanced History & Overrides</span>
                <span>{showAdvancedHistory ? '▲' : '▼'}</span>
              </button>
              
              {showAdvancedHistory && (
                <div style={{ paddingTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Manual Lifespan Override (Days)</label>
                  <input 
                    type="number" 
                    className="input neu-pressed" 
                    placeholder="e.g. 180" 
                    value={item.manualLifespanDays ?? ''} 
                    onChange={async e => {
                      const val = parseInt(e.target.value, 10);
                      await db.items.update(item.id, {
                        manualLifespanDays: isNaN(val) ? undefined : val,
                        updatedAt: Date.now()
                      });
                    }}
                    style={{ width: '100%', marginBottom: '1.5rem' }}
                  />
                  
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status Dates</h4>
                  {Array.from(new Set(item.statusHistory.map(s => s.status)))
                    .filter(status => ['in_use', 'finished'].includes(status))
                    .map(status => {
                    const entryIndex = item.statusHistory.findIndex(s => s.status === status);
                    const s = item.statusHistory[entryIndex];
                    const dt = new Date(s.timestamp);
                    const localStr = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                    const label = status === 'in_use' ? 'Opened' : 'Finished';
                    
                    return (
                      <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>{label}</span>
                        <DateInput 
                          className="input neu-pressed"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto', minWidth: '130px' }}
                          value={localStr}
                          onChange={async (val) => {
                            if (!val) return;
                            const [yyyy, mm, dd] = val.split('-');
                            const newTime = new Date(Number(yyyy), Number(mm)-1, Number(dd)).getTime();
                            
                            const newHistory = item.statusHistory.filter(x => x.status !== status);
                            newHistory.push({ status, timestamp: newTime });
                            newHistory.sort((a, b) => a.timestamp - b.timestamp);
                            
                            await db.items.update(item.id, { statusHistory: newHistory, updatedAt: Date.now() });
                          }}
                        />
                      </div>
                    );
                  })}
                  
                  <h4 style={{ margin: '1.5rem 0 0.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Manual Product Link</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Link this item's price history with another item in this category.</p>
                  <select 
                    className="input neu-pressed" 
                    value="" 
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      const targetItem = allItems?.find(i => i.id === e.target.value);
                      if (targetItem) {
                        let linkId = targetItem.productLinkId;
                        if (!linkId) {
                          linkId = uuidv4();
                          await db.items.update(targetItem.id, { productLinkId: linkId, updatedAt: Date.now() });
                        }
                        await db.items.update(item.id, { productLinkId: linkId, updatedAt: Date.now() });
                      }
                    }}
                    style={{ width: '100%', fontSize: '0.875rem', padding: '0.5rem' }}
                  >
                    <option value="">Select item to link...</option>
                    {allItems?.filter(i => i.categoryId === item.categoryId && i.id !== item.id && (!item.productLinkId || i.productLinkId !== item.productLinkId)).map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {showChart && (
            <div className="card neu-flat">
              <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={20} color="var(--accent-primary)" /> Price History</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div className="neu-pressed" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lowest</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>${minPrice.toFixed(2)}</div>
                </div>
                <div className="neu-pressed" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Highest</div>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent-danger)' }}>${maxPrice.toFixed(2)}</div>
                </div>
                <div className="neu-pressed" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Average</div>
                  <div style={{ fontWeight: 'bold' }}>${avgPrice.toFixed(2)}</div>
                </div>
                <div className="neu-pressed" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Latest</div>
                  <div style={{ fontWeight: 'bold' }}>${latestPrice.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ width: '100%', height: '120px', position: 'relative' }}>
                <svg viewBox="0 0 400 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid lines */}
                  <line x1="20" y1="20" x2="380" y2="20" stroke="var(--shadow-light)" strokeWidth="1" strokeDasharray="4" />
                  <line x1="20" y1="100" x2="380" y2="100" stroke="var(--shadow-light)" strokeWidth="1" strokeDasharray="4" />
                  
                  {/* Line */}
                  <path 
                    d={`M ${chartPts.map(p => `${p.x},${p.y}`).join(' L ')}`} 
                    fill="none" 
                    stroke="var(--accent-primary)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  
                  {/* Data Points */}
                  {chartPts.map((p, i) => (
                    <circle 
                      key={i} 
                      cx={p.x} 
                      cy={p.y} 
                      r="4" 
                      fill="var(--bg-color)" 
                      stroke="var(--accent-primary)" 
                      strokeWidth="2" 
                    />
                  ))}
                </svg>
              </div>
            </div>
          )}

          <div className="card neu-flat">
            <h2 style={{ marginTop: 0 }}>Metrics</h2>
            {formulas?.map(f => {
              const estVal = evaluateFormula(f.expression, formulaVariables);
              
              let showDual = false;
              let loggedVal: number | null = null;

              if (item.trackUsage && item.usageLog && item.usageLog.length > 0) {
                const totalQuantity = item.usageLog.reduce((sum, log) => sum + (log.quantityUsed || 0), 0);
                const loggedUses = totalQuantity > 0 ? totalQuantity : item.usageLog.length;
                
                const loggedVars = { ...formulaVariables, usageCount: loggedUses, uses: loggedUses };
                loggedVal = evaluateFormula(f.expression, loggedVars);
                
                if (estVal !== loggedVal) {
                  showDual = true;
                }
              }

              return (
                <div key={f.id} style={{ marginBottom: '1.25rem' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>{f.name}</p>
                  
                  {showDual ? (
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                      <div style={{ borderLeft: '3px solid var(--text-secondary)', paddingLeft: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Est. (Time-based)</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.125rem' }}>
                          {estVal !== null ? (Number.isInteger(estVal) ? estVal : estVal.toFixed(2)) : 'Err'}
                        </div>
                      </div>
                      <div style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Actual (Logged)</div>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '1.125rem' }}>
                          {loggedVal !== null ? (Number.isInteger(loggedVal) ? loggedVal : loggedVal.toFixed(2)) : 'Err'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontWeight: 600, margin: '0.25rem 0', color: 'var(--accent-primary)' }}>
                      {estVal !== null ? (Number.isInteger(estVal) ? estVal : estVal.toFixed(2)) : 'Error evaluating'}
                    </p>
                  )}
                  <p style={{ fontSize: '0.75rem', color: 'var(--shadow-dark)', marginTop: '0.25rem', opacity: 0.7 }}><code>{f.expression}</code></p>
                </div>
              );
            })}
            {formulas?.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No formulas defined for this category.</p>
            )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card neu-flat">
          <h2 style={{ marginTop: 0 }}>Audit Log</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>A chronological history of all changes made to this item.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {(item.statusHistory as any[]).map(sh => ({ ...sh, type: 'status' })).concat(
              (item.auditLog || []).map((al: any) => ({ ...al, type: 'field' }))
            ).sort((a: any, b: any) => b.timestamp - a.timestamp).map((entry: any, i: number) => (
              <div key={i} style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px' }} className="neu-pressed">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                {entry.type === 'status' ? (
                  <span>Status changed to <strong>{entry.status}</strong></span>
                ) : (
                  <span>
                    Changed <strong>{entry.field}</strong> from <span style={{ color: 'var(--accent-danger)' }}>{JSON.stringify(entry.oldValue) || 'none'}</span> to <span style={{ color: 'var(--accent-success)' }}>{JSON.stringify(entry.newValue) || 'none'}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
