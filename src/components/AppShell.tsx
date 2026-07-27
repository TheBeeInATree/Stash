import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Package, PlusCircle, Home, ShoppingCart, BarChart2, PieChart, Settings, MapPin, Layers, Archive, Cloud, Sun, Moon, Monitor, MoreHorizontal } from 'lucide-react';
import { UndoProvider } from '../contexts/UndoContext';
import { ShortcutsModal } from './ShortcutsModal';

import { Dashboard } from '../pages/Dashboard';
import { AddItem } from '../pages/AddItem';
import { Categories } from '../pages/Categories';
import { Locations } from '../pages/Locations';
import { Sets } from '../pages/Sets';
import { SetDetail } from '../pages/SetDetail';
import { ItemDetail } from '../pages/ItemDetail';
import { Compare } from '../pages/Compare';
import { Insights } from '../pages/Insights';
import { History } from '../pages/History';
import { ShoppingList } from '../pages/ShoppingList';
import { SyncSettings } from '../pages/SyncSettings';
import { OnboardingTour } from './OnboardingTour';
import { supabase } from '../lib/supabase';
import { startBackgroundSync } from '../lib/syncEngine';
import { pullCloudToLocal } from '../lib/sync';

interface AppShellProps {
  theme: string;
  setTheme: (t: string) => void;
  showShortcuts: boolean;
  setShowShortcuts: (s: boolean) => void;
}

export function AppShell({ theme, setTheme, showShortcuts, setShowShortcuts }: AppShellProps) {
  React.useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          // Initial pull to catch anything while offline, then start background engine
          pullCloudToLocal(data.user.id)
            .then(() => startBackgroundSync(data.user.id))
            .catch(console.error);
        }
      });
    }
  }, []);

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor size={20} />;
    if (theme === 'light') return <Sun size={20} />;
    return <Moon size={20} />;
  };

  return (
    <UndoProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav className="desktop-sidebar neu-flat" style={{ width: '250px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRight: '2px solid var(--shadow-light)' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
            <Package /> Inventory
          </h2>
          
          <Link to="/app/add" id="tour-add-item-desktop" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} /> Add Item
          </Link>
          <Link to="/app" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={20} /> Dashboard
          </Link>
          <Link to="/app/shopping-list" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={20} /> Shopping List
          </Link>
          <Link to="/app/compare" id="tour-compare" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={20} /> Compare
          </Link>
          <Link to="/app/insights" id="tour-insights" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={20} /> Insights
          </Link>
          <Link to="/app/categories" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} /> Categories
          </Link>
          <Link to="/app/locations" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} /> Locations
          </Link>
          <Link to="/app/sets" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} /> Sets
          </Link>
          <Link to="/app/history" id="tour-history" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Archive size={20} /> History
          </Link>
          <Link to="/app/sync" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cloud size={20} /> Cloud Sync
          </Link>

          <div style={{ flex: 1 }} />

          <button onClick={cycleTheme} className="btn neu-pressed" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            {getThemeIcon()} Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </button>
        </nav>
        
        <main style={{ flex: 1, padding: '2rem' }}>
          <OnboardingTour />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddItem />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/sets" element={<Sets />} />
            <Route path="/sets/:id" element={<SetDetail />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/history" element={<History />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/sync" element={<SyncSettings />} />
          </Routes>
        </main>
        
        {/* Mobile Nav */}
        <Link to="/app/add" id="tour-add-item-mobile" className="mobile-fab">
          <PlusCircle size={24} />
        </Link>
        
        <div className="mobile-bottom-bar">
          <Link to="/app" className="tab-item"><Home size={24} /><span>Home</span></Link>
          <Link to="/app/compare" className="tab-item"><BarChart2 size={24} /><span>Compare</span></Link>
          <Link to="/app/insights" className="tab-item"><PieChart size={24} /><span>Insights</span></Link>
          <Link to="/app/categories" className="tab-item"><MoreHorizontal size={24} /><span>More</span></Link>
        </div>

        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </UndoProvider>
  );
}
