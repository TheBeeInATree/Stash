import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Landing } from './pages/Landing';
import { DemoWalkthrough } from './pages/DemoWalkthrough';
import { db } from './db';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => localStorage.getItem('hasStarted') === 'true');

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

  return (
    <Routes>
      <Route path="/" element={hasStarted ? <Navigate to="/app" /> : <Landing onStart={() => { setHasStarted(true); localStorage.setItem('hasStarted', 'true'); }} />} />
      <Route path="/demo" element={<DemoWalkthrough />} />
      <Route path="/app/*" element={<AppShell theme={theme} setTheme={setTheme} showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts} />} />
    </Routes>
  );
}

export default App;
