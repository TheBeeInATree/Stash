import React, { useState, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { pushLocalToCloud, pullCloudToLocal } from '../lib/sync';
import { Cloud, UploadCloud, DownloadCloud, LogOut } from 'lucide-react';

export function SyncSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase?.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    }) ?? { data: null };
    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const handlePush = async () => {
    if (!user) return;
    setSyncMsg('Pushing...');
    try {
      await pushLocalToCloud(user.id);
      setSyncMsg('✅ All local data pushed to cloud!');
    } catch (e: any) {
      setSyncMsg('❌ Error: ' + e.message);
    }
  };

  const handlePull = async () => {
    if (!user) return;
    setSyncMsg('Pulling...');
    try {
      await pullCloudToLocal(user.id);
      setSyncMsg('✅ Cloud data pulled to this device!');
    } catch (e: any) {
      setSyncMsg('❌ Error: ' + e.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Cloud size={28} /> Cloud Sync
      </h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Your data lives on your device and syncs automatically with your account in the background.
      </p>

      {user ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>

          {/* Status */}
          <div className="card neu-flat" style={{ border: '1px solid var(--accent-success)', padding: '1.5rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cloud size={18} /> Automatic Background Sync Active
            </p>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Signed in as <strong>{user.email}</strong>. Changes sync instantly across all your devices.
            </p>
          </div>

          {/* Manual Sync */}
          <div className="card neu-flat" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Manual Sync</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Use these as emergency overrides if you believe your data is out of sync.
            </p>
            <button className="btn btn-primary" onClick={handlePush} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <UploadCloud size={20} /> Force Push Local Data
            </button>
            <button className="btn" onClick={handlePull} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <DownloadCloud size={20} /> Force Pull Cloud Data
            </button>
            {syncMsg && <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{syncMsg}</p>}
          </div>

          {/* Sign Out */}
          <button className="btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      ) : (
        <div className="card neu-flat" style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You are not signed in. Sign in to enable cloud sync.</p>
        </div>
      )}
    </div>
  );
}
