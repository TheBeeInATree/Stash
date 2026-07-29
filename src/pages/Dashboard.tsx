import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Location, type SavedSearch } from '../db';
import { Bookmark, Star, Download, Search, Clock, PlusCircle, CreditCard, Droplet, Monitor, Crosshair, Book, MoreHorizontal, Package, Tag, ArrowRight, DollarSign, AlertTriangle, Trash2 } from 'lucide-react';
import { useUndo } from '../contexts/UndoContext';
import { DashboardCard } from '../components/DashboardCard';
import { useSwipeable } from 'react-swipeable';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_LOW_STOCK_PERCENTAGE } from '../config/constants';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFullLocationPath } from './Locations';
import { getCategoryIcon } from '../lib/categoryIcons';
import { getEstimatedYearlyCost, getEstimatedDaysLeft } from '../lib/metrics';

type RecentSearch = { term: string, status: string, location: string };

const isLocationOrChild = (locId: string | null, targetLocId: string, locations: Location[]): boolean => {
  if (locId === targetLocId) return true;
  if (!locId) return false;
  const loc = locations.find(l => l.id === locId);
  if (!loc) return false;
  return isLocationOrChild(loc.parentLocationId, targetLocId, locations);
};

export function Dashboard() {
  const navigate = useNavigate();
  const { triggerDelete } = useUndo();
  
  const [editingCard, setEditingCard] = useState<{ id: string, field: 'price' | 'quantity', value: string } | null>(null);

  const handleInlineSave = async () => {
    if (!editingCard) return;
    const item = items?.find(i => i.id === editingCard.id);
    if (!item) {
      setEditingCard(null);
      return;
    }
    
    if (editingCard.field === 'price') {
      const p = parseFloat(editingCard.value);
      if (!isNaN(p)) {
        await db.items.update(item.id, { purchasePrice: p, updatedAt: Date.now() });
      }
    } else if (editingCard.field === 'quantity') {
      const p = parseFloat(editingCard.value);
      if (!isNaN(p)) {
        await db.items.update(item.id, { fields: { ...item.fields, quantity: p }, updatedAt: Date.now() });
      }
    }
    setEditingCard(null);
  };

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [location.search]);
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('dashboard_sort') || 'date-desc');

  useEffect(() => {
    localStorage.setItem('dashboard_sort', sortOrder);
  }, [sortOrder]);

  // Bulk Selection
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

  // Pull to refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullHandlers = useSwipeable({
    onSwipedDown: (e) => {
      if (window.scrollY === 0) {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
      }
    },
    trackMouse: false
  });

  // Saved Searches
  const savedSearches = useLiveQuery(() => db.savedSearches.toArray()) || [];
  
  const handleSaveSearch = async () => {
    const name = prompt('Name this search:');
    if (!name) return;
    await db.savedSearches.add({
      id: uuidv4(),
      name,
      filterConfig: { term: searchTerm, status: statusFilter, location: locationFilter },
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const togglePinSearch = async (s: SavedSearch, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.savedSearches.update(s.id, { pinned: !s.pinned, updatedAt: Date.now() });
  };

  const deleteSearch = async (s: SavedSearch, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete saved search "${s.name}"?`)) {
      await db.savedSearches.delete(s.id);
    }
  };

  const applySavedSearch = (s: SavedSearch) => {
    setSearchTerm(s.filterConfig.term || '');
    setStatusFilter(s.filterConfig.status || '');
    setLocationFilter(s.filterConfig.location || '');
    setShowRecentSearches(false);
  };

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm || statusFilter || locationFilter) {
        setRecentSearches(prev => {
          const newEntry = { term: searchTerm, status: statusFilter, location: locationFilter };
          const filtered = prev.filter(s => !(s.term === newEntry.term && s.status === newEntry.status && s.location === newEntry.location));
          const updated = [newEntry, ...filtered].slice(0, 10);
          localStorage.setItem('recentSearches', JSON.stringify(updated));
          return updated;
        });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, locationFilter]);

  const items = useLiveQuery(async () => {
    let collection = db.items.toCollection();
    return collection.toArray();
  });

  const categories = useLiveQuery(() => db.categories.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());

  const filteredItems = items?.filter(item => {
    const isArchived = item.status === 'finished' || item.status === 'discarded';
    if (isArchived) return false;

    let currentSearchTerm = searchTerm.toLowerCase();
    let explicitStatus: string | null = null;
    
    // Parse `status: something` from search term
    const statusMatch = currentSearchTerm.match(/status:\s*([a-zA-Z_]+)/);
    if (statusMatch) {
      explicitStatus = statusMatch[1];
      currentSearchTerm = currentSearchTerm.replace(statusMatch[0], '').trim();
    }

    const matchesSearch = !currentSearchTerm || item.name.toLowerCase().includes(currentSearchTerm) || item.tags.some(t => t.toLowerCase().includes(currentSearchTerm));
    const effectiveStatusFilter = explicitStatus || statusFilter;
    const matchesStatus = effectiveStatusFilter ? item.status === effectiveStatusFilter : item.status !== 'considering';
    
    let matchesLoc = true;
    if (locationFilter && locations) {
      if (locationFilter === 'unassigned') {
        matchesLoc = !item.locationId;
      } else {
        matchesLoc = isLocationOrChild(item.locationId || null, locationFilter, locations);
      }
    }
    
    return matchesSearch && matchesStatus && matchesLoc;
  }) || [];

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortOrder) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'price-asc': return (a.purchasePrice || 0) - (b.purchasePrice || 0);
      case 'price-desc': return (b.purchasePrice || 0) - (a.purchasePrice || 0);
      case 'date-asc': return a.createdAt - b.createdAt;
      case 'date-desc': default: return b.createdAt - a.createdAt;
    }
  });

  const alerts = sortedItems.map(item => {
    const msgs = [];

    // Low stock logic
    let isLowStock = false;
    let currentQty: number | undefined = undefined;
    let originalQty: number | undefined = undefined;
    
    if (item.groupId && items) {
       const groupItems = items.filter(i => i.groupId === item.groupId);
       originalQty = groupItems.length;
       currentQty = groupItems.filter(i => i.status !== 'finished' && i.status !== 'discarded').length;
    } else if (item.fields['quantity'] !== undefined) {
       currentQty = Number(item.fields['quantity']);
       originalQty = item.originalQuantity !== undefined && item.originalQuantity !== null ? item.originalQuantity : currentQty;
    }
    
    // Rate-based estimation taking priority
    const daysLeft = getEstimatedDaysLeft(item);
    if (daysLeft !== null) {
      if (daysLeft <= 14) { // E.g., alert if less than 2 weeks left based on consumption
        isLowStock = true;
      }
    } else {
      if (currentQty !== undefined && originalQty !== undefined && !isNaN(currentQty) && !isNaN(originalQty)) {
         if (item.lowStockThreshold !== undefined && item.lowStockThreshold !== null) {
            if (item.lowStockThreshold > 0 && currentQty <= item.lowStockThreshold) {
               isLowStock = true;
            }
         } else {
            let alertThreshold = Math.floor(originalQty * DEFAULT_LOW_STOCK_PERCENTAGE);
            if (alertThreshold < 1) alertThreshold = 0;
            if (currentQty <= alertThreshold && originalQty > 0) {
               isLowStock = true;
            }
         }
      }
    }
    
    if (isLowStock) {
      if (daysLeft !== null && daysLeft <= 14) {
        msgs.push(`Restock soon (${Math.ceil(daysLeft)} days left)`);
      } else {
        msgs.push('Low Stock');
      }
    }

    const expField = Object.entries(item.fields).find(([k]) => k.toLowerCase().includes('expiration'));
    if (expField && expField[1]) {
      const expDate = new Date(expField[1] as string).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (expDate - Date.now() < thirtyDays) {
        msgs.push(expDate < Date.now() ? 'Expired' : 'Expiring Soon');
      }
    }
    if (msgs.length > 0) return { item, msgs };
    return null;
  }).filter((a): a is { item: typeof filteredItems[0], msgs: string[] } => a !== null) || [];

  const handleExport = async () => {
    const itemsData = await db.items.toArray();
    const categoriesData = await db.categories.toArray();
    const formulasData = await db.formulas.toArray();
    const groupsData = await db.groups.toArray();
    const locationsData = await db.locations.toArray();

    const exportData = {
      items: itemsData,
      categories: categoriesData,
      formulas: formulasData,
      groups: groupsData,
      locations: locationsData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-bulk-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyRecentSearch = (search: RecentSearch) => {
    setSearchTerm(search.term);
    setStatusFilter(search.status);
    setLocationFilter(search.location);
    setShowRecentSearches(false);
  };

  const getMonthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  };
  const getYearStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), 0, 1).getTime();
  };

  const categoriesWithBudgets = categories?.filter(c => c.budget) || [];
  const budgetSummaries = categoriesWithBudgets.map(cat => {
    const start = cat.budget!.period === 'monthly' ? getMonthStart() : getYearStart();
    const periodSpend = items?.filter(i => 
      i.categoryId === cat.id && 
      (i.purchaseDate || i.createdAt) >= start && 
      i.status !== 'considering'
    ).reduce((sum, item) => sum + (item.purchasePrice || 0), 0) || 0;
    
    return { cat, periodSpend, budgetAmount: cat.budget!.amount };
  });

  const lowStockCount = alerts.filter(a => a.msgs.some(m => m.includes('Low Stock') || m.includes('Restock soon'))).length;
  const expiringCount = alerts.filter(a => a.msgs.includes('Expired') || a.msgs.includes('Expiring Soon')).length;

  // --- Bulk Handlers ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedItemIds(new Set(sortedItems.map(i => i.id)));
    else setSelectedItemIds(new Set());
  };

  const handleSelectItem = (id: string, checked: boolean, shiftKey: boolean) => {
    const idx = sortedItems.findIndex(i => i.id === id);
    if (idx === -1) return;

    let newSet = new Set(selectedItemIds);

    if (shiftKey && lastSelectedIdx !== null) {
      const start = Math.min(lastSelectedIdx, idx);
      const end = Math.max(lastSelectedIdx, idx);
      for (let i = start; i <= end; i++) {
        if (checked) newSet.add(sortedItems[i].id);
        else newSet.delete(sortedItems[i].id);
      }
    } else {
      if (checked) newSet.add(id);
      else newSet.delete(id);
    }
    
    setSelectedItemIds(newSet);
    setLastSelectedIdx(idx);
  };

  const handleBulkCategory = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    e.target.value = '';
    if (!newCatId || !categories || !items) return;
    const newCat = categories.find(c => c.id === newCatId);
    if (!newCat) return;

    if (confirm(`Move ${selectedItemIds.size} items to ${newCat.name}?\nWARNING: Any custom fields not present in ${newCat.name} will be permanently deleted.`)) {
      const validFields = newCat.fieldTemplate.map(f => f.name);
      for (const id of selectedItemIds) {
        const item = items.find(i => i.id === id);
        if (item) {
          const newFields: Record<string, any> = {};
          for (const f of validFields) {
            if (item.fields[f] !== undefined) newFields[f] = item.fields[f];
          }
          await db.items.update(id, { categoryId: newCatId, fields: newFields, updatedAt: Date.now() });
        }
      }
      setSelectedItemIds(new Set());
    }
  };

  const promptBulkTags = async () => {
    if (!items) return;
    const tagsStr = prompt('Enter tags (comma separated) to replace current tags.\nOr prepend with + to add to existing tags (e.g. +summer, +gift):');
    if (tagsStr === null) return;
    const isAdd = tagsStr.trim().startsWith('+');
    const cleanTags = tagsStr.replace(/^\+/, '').split(',').map(t => t.trim()).filter(Boolean);

    for (const id of selectedItemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        const newTags = isAdd ? Array.from(new Set([...item.tags, ...cleanTags])) : cleanTags;
        await db.items.update(id, { tags: newTags, updatedAt: Date.now() });
      }
    }
    setSelectedItemIds(new Set());
  };

  const handleBulkLocation = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value === 'unassigned' ? null : e.target.value;
    e.target.value = '';
    for (const id of selectedItemIds) {
      await db.items.update(id, { locationId: locId, updatedAt: Date.now() });
    }
    setSelectedItemIds(new Set());
  };

  const handleBulkStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as any;
    e.target.value = '';
    if (!newStatus || !items) return;
    const now = Date.now();
    for (const id of selectedItemIds) {
      const item = items.find(i => i.id === id);
      if (item) {
        const newHistory = item.statusHistory.filter(s => s.status !== newStatus);
        newHistory.push({ status: newStatus, timestamp: now });
        newHistory.sort((a, b) => a.timestamp - b.timestamp);
        await db.items.update(id, { status: newStatus, statusHistory: newHistory, updatedAt: now });
      }
    }
    setSelectedItemIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!items) return;
    const itemsToDelete = items.filter(i => selectedItemIds.has(i.id));
    triggerDelete('items', itemsToDelete);
    setSelectedItemIds(new Set());
  };

  const handleBulkExport = () => {
    if (!items) return;
    const itemsToExport = items.filter(i => selectedItemIds.has(i.id));
    const data = {
      items: itemsToExport,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-bulk-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div {...pullHandlers} style={{ paddingBottom: selectedItemIds.size > 0 ? '80px' : '0', minHeight: '100%' }}>
      {isRefreshing && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
          Refreshing...
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <button className="btn neu-pressed desktop-only" onClick={handleExport} style={{ padding: '0.5rem', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Download size={16} /> Export All JSON
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          
          <div id="tour-search" style={{ position: 'relative', flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center' }}>
            <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', zIndex: 1 }} />
            <input 
              type="text" 
              placeholder="Search items, tags, notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
              className="input neu-pressed"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
            {showRecentSearches && (recentSearches.length > 0 || savedSearches.length > 0) && (
              <div className="neu-convex" style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px', zIndex: 10, maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ margin: '0 0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Saved Searches</p>
                  <button className="btn" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleSaveSearch(); }}>Save Current</button>
                </div>
                {savedSearches.length === 0 && <p style={{ margin: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No saved searches.</p>}
                {savedSearches.sort((a, b) => Number(b.pinned) - Number(a.pinned)).map(ss => (
                  <div 
                    key={ss.id} 
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--shadow-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => applySavedSearch(ss)}
                  >
                    <Bookmark size={14} color={ss.pinned ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                    <span style={{ fontSize: '0.875rem', flex: 1 }}>{ss.name}</span>
                    <button className="btn" style={{ padding: '2px' }} onClick={e => togglePinSearch(ss, e)}>
                      <Star size={14} color={ss.pinned ? 'var(--accent-primary)' : 'var(--text-secondary)'} fill={ss.pinned ? 'var(--accent-primary)' : 'transparent'} />
                    </button>
                    <button className="btn" style={{ padding: '2px', color: 'var(--accent-danger)' }} onClick={e => deleteSearch(ss, e)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                <p style={{ margin: '1rem 0 0.5rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderTop: '1px solid var(--shadow-light)', paddingTop: '0.5rem' }}>Recent Searches</p>
                {recentSearches.map((rs, i) => (
                  <div 
                    key={`rs-${i}`} 
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--shadow-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => applyRecentSearch(rs)}
                  >
                    <Clock size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.875rem' }}>
                      {rs.term || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Any Text</span>} 
                      {rs.status && <span style={{ marginLeft: '0.5rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--shadow-light)', fontSize: '0.7rem' }}>{rs.status}</span>}
                      {rs.location && <span style={{ marginLeft: '0.5rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--shadow-light)', fontSize: '0.7rem' }}>Location Filter</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <select className="input neu-pressed" value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={{ width: '180px' }}>
            <option value="">All Locations</option>
            <option value="unassigned">Unassigned</option>
            {locations?.map(l => (
              <option key={l.id} value={l.id}>{getFullLocationPath(locations, l.id)}</option>
            ))}
          </select>

          <select className="input neu-pressed" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '150px' }}>
            <option value="">All Owned (Active)</option>
            <option value="considering">Considering</option>
            <option value="unopened">Unopened</option>
            <option value="in_use">In Use</option>
          </select>
          
          <select className="input neu-pressed" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ width: '150px' }}>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="price-desc">Price (High-Low)</option>
            <option value="price-asc">Price (Low-High)</option>
          </select>

        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-primary)', cursor: 'pointer' }} onClick={() => navigate('/insights')}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <DollarSign size={16} /> Budget Preview
          </h3>
          {budgetSummaries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {budgetSummaries.slice(0, 3).map(b => (
                <div key={b.cat.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span>{getCategoryIcon(b.cat.name, b.cat.icon)} {b.cat.name}</span>
                  <span style={{ color: b.periodSpend > b.budgetAmount ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                    ${b.periodSpend.toFixed(0)} / ${b.budgetAmount}
                  </span>
                </div>
              ))}
              {budgetSummaries.length > 3 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>+ {budgetSummaries.length - 3} more</div>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No budgets set.</p>
          )}
        </div>

        <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-danger)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Clock size={16} /> Expiring Soon
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: expiringCount > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
            {expiringCount} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>items</span>
          </p>
        </div>

        <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-warning)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <AlertTriangle size={16} /> Low Stock
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: lowStockCount > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
            {lowStockCount} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>items</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem' }}>
        <h2 style={{ margin: 0 }}>Your stash</h2>
        {filteredItems.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0} 
              onChange={handleSelectAll} 
            />
            Select All
          </label>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
        {items === undefined && (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skel-${i}`} className="card neu-flat" style={{ opacity: 0.5 }}>
              <div style={{ height: '24px', width: '60%', background: 'var(--shadow-light)', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ height: '16px', width: '40%', background: 'var(--shadow-light)', borderRadius: '4px', marginBottom: '2rem' }} />
              <div style={{ height: '20px', width: '30%', background: 'var(--shadow-light)', borderRadius: '4px', alignSelf: 'flex-end' }} />
            </div>
          ))
        )}
        {sortedItems?.map((item, index) => {
          const category = categories?.find(c => c.id === item.categoryId);
          const isSelected = selectedItemIds.has(item.id);
          
          return (
            <DashboardCard 
              key={item.id}
              item={item}
              category={category}
              isSelected={isSelected}
              onSelect={handleSelectItem}
            />
          );
        })}
        {sortedItems?.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No items found.
          </div>
        )}
      </div>

      {selectedItemIds.size > 0 && (
        <div className="neu-convex" style={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: 'var(--bg-color)', 
          padding: '1rem 2rem', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          zIndex: 100, borderTop: '1px solid var(--shadow-dark)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'var(--accent-primary)' }}>{selectedItemIds.size} selected</span>
            <button className="btn" onClick={() => setSelectedItemIds(new Set())}>Clear</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select className="input neu-pressed" onChange={handleBulkCategory} value="">
              <option value="" disabled>Change Category...</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <button className="btn neu-pressed" onClick={promptBulkTags}>Tags...</button>
            
            <select className="input neu-pressed" onChange={handleBulkLocation} value="">
              <option value="" disabled>Change Location...</option>
              <option value="unassigned">Unassigned</option>
              {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            
            <select className="input neu-pressed" onChange={handleBulkStatus} value="">
              <option value="" disabled>Change Status...</option>
              <option value="considering">Considering</option>
              <option value="unopened">Unopened</option>
              <option value="in_use">In Use</option>
              <option value="finished">Finished</option>
              <option value="discarded">Discarded</option>
            </select>
            
            <button className="btn neu-pressed" onClick={handleBulkExport} title="Export Selected"><Download size={16}/></button>
            <button className="btn neu-pressed" style={{ color: 'var(--accent-danger)' }} onClick={handleBulkDelete} title="Delete Selected"><Trash2 size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );
}
