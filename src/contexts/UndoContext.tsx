import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { db } from '../db';
import { RefreshCw } from 'lucide-react';

interface UndoContextType {
  triggerDelete: (table: 'items' | 'categories' | 'locations' | 'sets', itemsToDelete: any[], message?: string) => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) throw new Error('useUndo must be used within an UndoProvider');
  return context;
}

interface Toast {
  id: string;
  table: string;
  items: any[];
  message: string;
  timeoutId: NodeJS.Timeout;
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerDelete = async (table: 'items' | 'categories' | 'locations' | 'sets', itemsToDelete: any[], customMessage?: string) => {
    if (!itemsToDelete.length) return;
    
    // 1. Immediately delete from Dexie
    const ids = itemsToDelete.map(i => i.id);
    await (db as any)[table].bulkDelete(ids);

    const message = customMessage || (itemsToDelete.length === 1 ? 'Item deleted' : `${itemsToDelete.length} items deleted`);
    const id = Math.random().toString(36).substr(2, 9);
    
    const timeoutId = setTimeout(() => {
      // It's gone permanently, just clean up the toast
      removeToast(id);
    }, 5000);

    setToasts(prev => [...prev, { id, table, items: itemsToDelete, message, timeoutId }]);
  };

  const handleUndo = async (toast: Toast) => {
    clearTimeout(toast.timeoutId);
    removeToast(toast.id);
    
    // Restore items to Dexie
    await (db as any)[toast.table].bulkAdd(toast.items);
  };

  return (
    <UndoContext.Provider value={{ triggerDelete }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '80px', // slightly above bottom to clear mobile nav
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div key={toast.id} className="neu-convex" style={{
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            pointerEvents: 'auto',
            border: '1px solid var(--shadow-light)'
          }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toast.message}</span>
            <div style={{ width: '1px', height: '16px', background: 'var(--text-secondary)', opacity: 0.3 }} />
            <button 
              onClick={() => handleUndo(toast)} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: 0
              }}
            >
              <RefreshCw size={14} /> Undo
            </button>
          </div>
        ))}
      </div>
    </UndoContext.Provider>
  );
}
