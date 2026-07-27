import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AppShell } from './components/AppShell';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { DemoWalkthrough } from './pages/DemoWalkthrough';
import { supabase } from './lib/supabase';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    // Get the initial session
    supabase?.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    }) ?? { data: null };

    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Still checking session — show nothing to avoid flash of wrong content
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/auth" element={session ? <Navigate to="/app" replace /> : <Auth />} />
      <Route path="/demo" element={<DemoWalkthrough />} />

      {/* Protected app routes — redirect to /auth if not signed in */}
      <Route
        path="/app/*"
        element={
          session
            ? <AppShell
                theme={theme}
                setTheme={setTheme}
                showShortcuts={showShortcuts}
                setShowShortcuts={setShowShortcuts}
                userId={session.user.id}
              />
            : <Navigate to="/auth" replace />
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
