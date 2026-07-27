import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Package, Mail, Lock, ArrowRight, Loader } from 'lucide-react';

export function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!supabase) return;
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.75rem', marginBottom: '2.5rem' }}>
        <Package size={32} /> Stash
      </Link>

      {/* Card */}
      <div className="card neu-flat" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: '10px', padding: '4px', boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)', marginBottom: '2rem' }}>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer', borderRadius: '8px',
              background: mode === 'signup' ? 'var(--accent-primary)' : 'transparent',
              color: mode === 'signup' ? 'white' : 'var(--text-secondary)',
              fontWeight: mode === 'signup' ? 'bold' : 'normal',
              transition: 'all 0.2s',
              fontSize: '0.95rem',
            }}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer', borderRadius: '8px',
              background: mode === 'login' ? 'var(--accent-primary)' : 'transparent',
              color: mode === 'login' ? 'white' : 'var(--text-secondary)',
              fontWeight: mode === 'login' ? 'bold' : 'normal',
              transition: 'all 0.2s',
              fontSize: '0.95rem',
            }}
          >
            Log In
          </button>
        </div>

        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', fontSize: '0.9rem' }}>
          {mode === 'signup'
            ? 'Start tracking your inventory. Free forever.'
            : 'Sign in to access your Stash.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input
              className="input neu-pressed"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.75rem', boxSizing: 'border-box' }}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
            <input
              className="input neu-pressed"
              type="password"
              placeholder={mode === 'signup' ? 'Choose a password (6+ chars)' : 'Your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.75rem', boxSizing: 'border-box' }}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: '8px', color: 'var(--accent-danger)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
          >
            {loading
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> {mode === 'signup' ? 'Creating account...' : 'Signing in...'}</>
              : <>{mode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={18} /></>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
          >
            {mode === 'signup' ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>

      <p style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        <Link to="/" style={{ color: 'var(--text-secondary)' }}>← Back to homepage</Link>
      </p>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
