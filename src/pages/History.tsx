import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Location } from '../db';
import { Search, Filter, AlertTriangle, Download, Trash2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFullLocationPath } from './Locations';

type RecentSearch = { term: string, status: string, location: string };

const isLocationOrChild = (locId: string | null, targetLocId: string, locations: Location[]): boolean => {
  if (locId === targetLocId) return true;
  if (!locId) return false;
  const loc = locations.find(l => l.id === locId);
  if (!loc) return false;
  return isLocationOrChild(loc.parentLocationId, targetLocId, locations);
};

export function History() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Bulk Selection
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

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
    if (!isArchived) return false;

    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    
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



  const handleExport = async () => {
    const itemsData = await db.items.toArray();
    const categoriesData = await db.categories.toArray();
    const formulasData = await db.formulas.toArray();
    const groupsData = await db.groups.toArray();
    const locationsData = await db.locations.toArray();
    
    const data = {
      items: itemsData,
      categories: categoriesData,
      formulas: formulasData,
      groups: groupsData,
      locations: locationsData,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Bulk Handlers ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
    else setSelectedItemIds(new Set());
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSet = new Set(selectedItemIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedItemIds(newSet);
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
    if (confirm(`Are you sure you want to permanently delete ${selectedItemIds.size} items?`)) {
      for (const id of selectedItemIds) {
        await db.items.delete(id);
      }
      setSelectedItemIds(new Set());
    }
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

  const applyRecentSearch = (search: RecentSearch) => {
    setSearchTerm(search.term);
    setStatusFilter(search.status);
    setLocationFilter(search.location);
    setShowRecentSearches(false);
  };

  return (
    <div style={{ paddingBottom: selectedItemIds.size > 0 ? '80px' : '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>Archive History</h1>
          <button className="btn neu-pressed" onClick={handleExport} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <Download size={16} /> Export All JSON
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', position: 'relative' }}>
          
          <div className="input neu-pressed" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px', background: 'var(--bg-color)', position: 'relative' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              id="global-search"
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%' }} 
              placeholder="Search items, tags..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              onFocus={() => setShowRecentSearches(true)}
              onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            />
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="neu-convex" style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px', zIndex: 10 }}>
                <p style={{ margin: '0 0 0.5rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recent Searches</p>
                {recentSearches.map((rs, i) => (
                  <div 
                    key={i} 
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
            <option value="">All Archived</option>
            <option value="finished">Finished</option>
            <option value="discarded">Discarded</option>
          </select>

        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card neu-flat" style={{ opacity: 0.8 }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Archived Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>{filteredItems?.length || 0}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem' }}>
        <h2 style={{ margin: 0 }}>Your Inventory</h2>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {filteredItems?.map(item => {
          const category = categories?.find(c => c.id === item.categoryId);
          const isSelected = selectedItemIds.has(item.id);
          
          return (
            <div 
              key={item.id} 
              className={`card neu-flat ${isSelected ? 'neu-convex' : ''}`} 
              style={{ transition: 'all 0.2s', border: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
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
              {item.purchasePrice !== null && (
                <p style={{ fontWeight: 'bold', marginTop: '1rem', marginLeft: '1.75rem' }}>${item.purchasePrice.toFixed(2)}</p>
              )}
            </div>
          );
        })}
        {filteredItems?.length === 0 && (
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
