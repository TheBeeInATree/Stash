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
import { Settings as SettingsPage } from '../pages/Settings';
import { OnboardingTour } from './OnboardingTour';
import { startBackgroundSync } from '../lib/syncEngine';
import { pullCloudToLocal, pushLocalToCloud } from '../lib/sync';

interface AppShellProps {
  theme: string;
  setTheme: (t: string) => void;
  showShortcuts: boolean;
  setShowShortcuts: (s: boolean) => void;
  userId: string;
}

export function AppShell({ theme, setTheme, showShortcuts, setShowShortcuts, userId }: AppShellProps) {

  React.useEffect(() => {
    // Pull from cloud first, then start engine
    pullCloudToLocal(userId)
      .then(() => startBackgroundSync(userId))
      .catch(console.error);
  }, [userId]);



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
          <Link to="/app/settings" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20} /> Settings
          </Link>

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
            <Route path="/settings" element={<SettingsPage theme={theme} setTheme={setTheme} />} />
          </Routes>
        </main>
        
        {/* Mobile Nav */}
        <Link to="/app/add" id="tour-add-item-mobile" className="mobile-fab">
          <PlusCircle size={24} />
        </Link>
        <div className="mobile-bottom-bar">
          <Link to="/app" className="tab-item"><Home size={24} /><span>Home</span></Link>
          <Link to="/app/shopping-list" className="tab-item"><ShoppingCart size={24} /><span>List</span></Link>
          <Link to="/app/compare" className="tab-item"><BarChart2 size={24} /><span>Compare</span></Link>
          <Link to="/app/insights" className="tab-item"><PieChart size={24} /><span>Insights</span></Link>
          <Link to="/app/categories" className="tab-item"><Settings size={24} /><span>Categories</span></Link>
          <Link to="/app/locations" className="tab-item"><MapPin size={24} /><span>Locations</span></Link>
          <Link to="/app/sets" className="tab-item"><Layers size={24} /><span>Sets</span></Link>
          <Link to="/app/history" className="tab-item"><Archive size={24} /><span>History</span></Link>
          <Link to="/app/settings" className="tab-item"><Settings size={24} /><span>Settings</span></Link>
        </div>

        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </UndoProvider>
  );
}
