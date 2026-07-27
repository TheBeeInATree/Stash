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
  const [showLocalDataBanner, setShowLocalDataBanner] = React.useState(false);

  React.useEffect(() => {
    // Pull from cloud first, then start engine
    pullCloudToLocal(userId)
      .then(() => startBackgroundSync(userId))
      .catch(console.error);

    // Check if user has local data that hasn't been synced yet
    const hasPushed = localStorage.getItem(`hasPushed_${userId}`);
    if (!hasPushed) {
      import('../db').then(({ db }) => {
        db.items.count().then(count => {
          if (count > 0) setShowLocalDataBanner(true);
        });
      });
    }
  }, [userId]);

  const handlePushLocalData = async () => {
    try {
      await pushLocalToCloud(userId);
      localStorage.setItem(`hasPushed_${userId}`, 'true');
      setShowLocalDataBanner(false);
    } catch (e) {
      console.error('Failed to push local data:', e);
    }
  };

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

          <div style={{ flex: 1 }} />

          {/* User Profile / Settings */}
          <Link to="/app/settings" style={{
            width: '40px',
            minHeight: '40px',
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            textDecoration: 'none',
            alignSelf: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            marginTop: '1rem'
          }}>
            {userId.substring(0, 2).toUpperCase()}
          </Link>
        </nav>
        
        <main style={{ flex: 1, padding: '2rem' }}>
          <OnboardingTour />

          {/* Local Data Push Banner */}
          {showLocalDataBanner && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
              padding: '1rem 1.5rem', marginBottom: '1.5rem', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))',
              border: '1px solid var(--accent-primary)',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>📦 You have local data!</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Push your existing inventory to your new account so it's safe and synced.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary" onClick={handlePushLocalData} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                  Push to Cloud
                </button>
                <button className="btn" onClick={() => { setShowLocalDataBanner(false); localStorage.setItem(`hasPushed_${userId}`, 'true'); }} style={{ whiteSpace: 'nowrap' }}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
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
          <Link to="/app/compare" className="tab-item"><BarChart2 size={24} /><span>Compare</span></Link>
          <Link to="/app/insights" className="tab-item"><PieChart size={24} /><span>Insights</span></Link>
          <Link to="/app/categories" className="tab-item"><MoreHorizontal size={24} /><span>More</span></Link>
        </div>

        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </UndoProvider>
  );
}
