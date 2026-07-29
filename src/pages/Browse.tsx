import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Location, type SavedSearch } from '../db';
import { Bookmark, Star, Download, Search, Clock, Trash2 } from 'lucide-react';
import { useUndo } from '../contexts/UndoContext';
import { DashboardCard } from '../components/DashboardCard';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFullLocationPath } from './Locations';

type RecentSearch = { term: string, status: string, location: string };

const isLocationOrChild = (locId: string | null, targetLocId: string, locations: Location[]): boolean => {
  if (locId === targetLocId) return true;
  if (!locId) return false;
  const loc = locations.find(l => l.id === locId);
  if (!loc) return false;
  return isLocationOrChild(loc.parentLocationId, targetLocId, locations);
};

export function Browse() {
  const navigate = useNavigate();
  const { triggerDelete } = useUndo();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q');
    if (q !== null) setSearchTerm(q);
  }, [location.search]);

  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('browse_sort') || 'date-desc');

  useEffect(() => {
    localStorage.setItem('browse_sort', sortOrder);
  }, [sortOrder]);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

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
    if (confirm(`Delete saved search "${s.name}"?`)) await db.savedSearches.delete(s.id);
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

  const items = useLiveQuery(async () => db.items.toCollection().toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());

  const filteredItems = items?.filter(item => {
    const isArchived = item.status === 'finished' || item.status === 'discarded';
    if (isArchived) return false;

    let currentSearchTerm = searchTerm.toLowerCase();
    let explicitStatus: string | null = null;

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
      if (locationFilter === 'unassigned') matchesLoc = !item.locationId;
      else matchesLoc = isLocationOrChild(item.locationId || null, locationFilter, locations);
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

  // Bulk handlers
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
    const blob = new Blob([JSON.stringify({ items: itemsToExport, exportDate: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stash-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ paddingBottom: selectedItemIds.size > 0 ? '80px' : '0', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.25rem 0' }}>Browse</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {items === undefined ? 'Loading...' : `${sortedItems.length} item${sortedItems.length !== 1 ? 's' : ''}`}
          {(searchTerm || statusFilter || locationFilter) && items !== undefined && filteredItems.length !== items.length ? ` of ${items.length} total` : ''}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {/* Search */}
        <div id="browse-search" style={{ position: 'relative', flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', zIndex: 1 }} />
          <input
            type="text"
            placeholder="Search items, tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            className="input neu-pressed"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
          {showRecentSearches && (recentSearches.length > 0 || savedSearches.length > 0) && (
            <div className="neu-convex" style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '8px', zIndex: 10, maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <p style={{ margin: '0 0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Saved Searches</p>
                <button className="btn" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={e => { e.stopPropagation(); handleSaveSearch(); }}>Save Current</button>
              </div>
              {savedSearches.length === 0 && <p style={{ margin: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No saved searches.</p>}
              {savedSearches.sort((a, b) => Number(b.pinned) - Number(a.pinned)).map(ss => (
                <div key={ss.id} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--shadow-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => applySavedSearch(ss)}>
                  <Bookmark size={14} color={ss.pinned ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                  <span style={{ fontSize: '0.875rem', flex: 1 }}>{ss.name}</span>
                  <button className="btn" style={{ padding: '2px' }} onClick={e => togglePinSearch(ss, e)}><Star size={14} color={ss.pinned ? 'var(--accent-primary)' : 'var(--text-secondary)'} fill={ss.pinned ? 'var(--accent-primary)' : 'transparent'} /></button>
                  <button className="btn" style={{ padding: '2px', color: 'var(--accent-danger)' }} onClick={e => deleteSearch(ss, e)}><Trash2 size={14} /></button>
                </div>
              ))}
              <p style={{ margin: '1rem 0 0.5rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', borderTop: '1px solid var(--shadow-light)', paddingTop: '0.5rem' }}>Recent</p>
              {recentSearches.map((rs, i) => (
                <div key={`rs-${i}`} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--shadow-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => { setSearchTerm(rs.term); setStatusFilter(rs.status); setLocationFilter(rs.location); setShowRecentSearches(false); }}>
                  <Clock size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '0.875rem' }}>
                    {rs.term || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Any Text</span>}
                    {rs.status && <span style={{ marginLeft: '0.5rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--shadow-light)', fontSize: '0.7rem' }}>{rs.status}</span>}
                    {rs.location && <span style={{ marginLeft: '0.5rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--shadow-light)', fontSize: '0.7rem' }}>Location</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <select className="input neu-pressed" value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={{ minWidth: '140px' }}>
          <option value="">All Locations</option>
          <option value="unassigned">Unassigned</option>
          {locations?.map(l => <option key={l.id} value={l.id}>{getFullLocationPath(locations, l.id)}</option>)}
        </select>

        <select className="input neu-pressed" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: '130px' }}>
          <option value="">All Active</option>
          <option value="considering">Considering</option>
          <option value="unopened">Unopened</option>
          <option value="in_use">In Use</option>
        </select>

        <select className="input neu-pressed" value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ minWidth: '130px' }}>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="name-asc">Name (A–Z)</option>
          <option value="name-desc">Name (Z–A)</option>
          <option value="price-desc">Price (High–Low)</option>
          <option value="price-asc">Price (Low–High)</option>
        </select>
      </div>

      {/* Select All row */}
      {filteredItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={selectedItemIds.size === filteredItems.length && filteredItems.length > 0} onChange={handleSelectAll} />
            Select All
          </label>
        </div>
      )}

      {/* Item Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
        {items === undefined && (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skel-${i}`} className="card neu-flat" style={{ opacity: 0.5 }}>
              <div style={{ height: '24px', width: '60%', background: 'var(--shadow-light)', borderRadius: '4px', marginBottom: '1rem' }} />
              <div style={{ height: '16px', width: '40%', background: 'var(--shadow-light)', borderRadius: '4px', marginBottom: '2rem' }} />
              <div style={{ height: '20px', width: '30%', background: 'var(--shadow-light)', borderRadius: '4px' }} />
            </div>
          ))
        )}
        {sortedItems.map(item => {
          const category = categories?.find(c => c.id === item.categoryId);
          return (
            <DashboardCard
              key={item.id}
              item={item}
              category={category}
              isSelected={selectedItemIds.has(item.id)}
              onSelect={handleSelectItem}
            />
          );
        })}
        {items !== undefined && sortedItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            {searchTerm || statusFilter || locationFilter ? (
              <>
                <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No items match your filters.</p>
                <button className="btn neu-pressed" onClick={() => { setSearchTerm(''); setStatusFilter(''); setLocationFilter(''); }}>Clear Filters</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Your Stash is empty.</p>
                <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Add your first item to get started.</p>
                <button className="btn btn-primary" onClick={() => navigate('/app/add')}>+ Add Item</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedItemIds.size > 0 && (
        <div className="neu-convex" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-color)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, borderTop: '1px solid var(--shadow-dark)' }}>
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
            <button className="btn neu-pressed" onClick={handleBulkExport} title="Export Selected"><Download size={16} /></button>
            <button className="btn neu-pressed" style={{ color: 'var(--accent-danger)' }} onClick={handleBulkDelete} title="Delete Selected"><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
