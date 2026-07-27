import React, { useState, useEffect } from 'react';
import { supabase, configureSupabase, hasSupabaseConfig } from '../lib/supabase';
import { Cloud, Fingerprint, LogIn, Save } from 'lucide-react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export function SyncSettings() {
  const [url, setUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('supabase_key') || '');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
        setLoading(false);
      });
      const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
        setUser(session?.user || null);
      });
      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [url, key]);

  const handleSaveConfig = () => {
    configureSupabase(url, key);
    window.location.reload(); // Reload to initialize client properly everywhere
  };

  const handleMagicLink = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Check your email for the login link!');
  };

  const handleBiometricRegister = async () => {
    // In a real app, this requires a backend to generate registration options.
    // For MVP, we alert that it's mocked, or we rely on Supabase's native passkey support if available.
    alert('Biometric registration requires backend challenge generation. Supabase Passkeys feature could be used here when configured on the project.');
  };

  const handleBiometricLogin = async () => {
    // Mocked for MVP unless backend is fully set up.
    alert('Biometric login would initiate here using startAuthentication() from @simplewebauthn/browser.');
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Cloud size={28} /> Cloud Sync
      </h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Sync your inventory across devices and share with your household. Your data is always available locally offline.
      </p>

      {!hasSupabaseConfig() ? (
        <div className="card neu-flat" style={{ marginTop: '2rem' }}>
          <h2>Configure Supabase</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            To enable sync, you need a Supabase project. Enter your project URL and Anon Key.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <input className="input neu-pressed" placeholder="Supabase URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
            <input className="input neu-pressed" placeholder="Supabase Anon Key" type="password" value={key} onChange={e => setKey(e.target.value)} />
            <button className="btn btn-primary" onClick={handleSaveConfig} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Save Configuration
            </button>
          </div>
        </div>
      ) : loading ? (
        <p>Loading...</p>
      ) : !user ? (
        <div className="card neu-flat" style={{ marginTop: '2rem' }}>
          <h2>Sign In to Sync</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input neu-pressed" style={{ flex: 1 }} placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
              <button className="btn" onClick={handleMagicLink} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogIn size={18} /> Magic Link
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--shadow-light)' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--shadow-light)' }} />
            </div>

            <button className="btn btn-primary" onClick={handleBiometricLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Fingerprint size={20} /> Sign in with Biometrics / Passkey
            </button>
            
            <button className="btn" onClick={handleBiometricRegister} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'transparent', boxShadow: 'none' }}>
              Register new biometric device
            </button>
          </div>
        </div>
      ) : (
        <div className="card neu-flat" style={{ marginTop: '2rem' }}>
          <h2>Signed In</h2>
          <p>You are signed in as: <strong>{user.email}</strong></p>
          <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--accent-success)', marginBottom: '1.5rem' }} className="neu-pressed">
            <p style={{ margin: 0, color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cloud size={18} /> Cloud Sync is Active
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Your local database will automatically sync with the cloud in the background (last-write-wins).
            </p>
          </div>
          <button className="btn" onClick={handleLogout}>Sign Out</button>
        </div>
      )}
    </div>
  );
}
