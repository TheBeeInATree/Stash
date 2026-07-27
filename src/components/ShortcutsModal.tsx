import React from 'react';
import { Command } from 'lucide-react';

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'Ctrl + K', desc: 'Focus Global Search' },
    { key: 'Ctrl + N', desc: 'Add New Item' },
    { key: 'Alt + 1', desc: 'Go to Dashboard' },
    { key: 'Alt + 2', desc: 'Go to Categories' },
    { key: 'Alt + 3', desc: 'Go to Locations' },
    { key: 'Alt + 4', desc: 'Go to Compare' },
    { key: 'Alt + 5', desc: 'Go to Insights' },
    { key: 'Alt + 6', desc: 'Go to History' },
    { key: 'Esc', desc: 'Close modals/menus' },
    { key: '?', desc: 'Show this help overlay' }
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card neu-convex" style={{ width: '90%', maxWidth: '400px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Command size={20} /> Keyboard Shortcuts
          </h3>
          <button className="btn neu-pressed" onClick={onClose} style={{ padding: '0.25rem 0.75rem' }}>Close</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shortcuts.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
              <kbd style={{ 
                background: 'var(--bg-color)', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '6px', 
                fontSize: '0.85rem',
                boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
