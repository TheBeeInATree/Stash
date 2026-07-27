import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { pushLocalToCloud, pullCloudToLocal } from '../lib/sync';
import { LogOut, Cloud, Sun, Moon, Monitor, UploadCloud, DownloadCloud, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  theme: string;
  setTheme: (t: string) => void;
}

export function Settings({ theme, setTheme }: SettingsProps) {
  const [user, setUser] = useState<any>(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'sync'>('account');

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setUser(data.session?.user));
    supabase?.auth.onAuthStateChange((_, session) => setUser(session?.user));
  }, []);

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    window.location.href = '/auth';
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
      setSyncMsg('✅ All cloud data pulled locally!');
    } catch (e: any) {
      setSyncMsg('❌ Error: ' + e.message);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          padding: '12px',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
          display: 'flex'
        }}>
          <SettingsIcon />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>Manage your preferences and data</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
        
        {/* Sidebar Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<LogOut size={20} />} label="Account Details" />
          <TabButton active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} icon={<Sun size={20} />} label="Appearance" />
          <TabButton active={activeTab === 'sync'} onClick={() => setActiveTab('sync')} icon={<Cloud size={20} />} label="Cloud Sync" />
        </div>

        {/* Content Area */}
        <div className="card" style={{ gridColumn: 'span 2', minHeight: '400px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative background glow */}
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'var(--accent-primary)', opacity: 0.05, filter: 'blur(50px)', borderRadius: '50%', pointerEvents: 'none' }} />

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LogOut size={24} style={{ color: 'var(--accent-primary)' }}/> Account Profile
              </h2>
              
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Email Address
                    </label>
                    <div style={{ fontSize: '1.125rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {user.email}
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={20} /> Danger Zone
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      Sign out of your account on this device. Ensure all your local data has been successfully pushed to the cloud before proceeding.
                    </p>
                    <button onClick={handleSignOut} style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                      <LogOut size={18} /> Sign Out Now
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-color)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <AlertTriangle size={48} style={{ color: '#f59e0b', margin: '0 auto 1rem', opacity: 0.8 }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Invalid Session Detected</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                    Your browser has a dead token (likely because you deleted the user from the Supabase dashboard). Please clear your token to proceed.
                  </p>
                  <button onClick={handleSignOut} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    Clear Token & Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Sun size={24} style={{ color: 'var(--accent-primary)' }}/> Appearance Settings
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <ThemeCard 
                  active={theme === 'light'} 
                  onClick={() => setTheme('light')} 
                  icon={<Sun size={28} />} 
                  title="Light Mode" 
                  desc="Bright and clear"
                />
                <ThemeCard 
                  active={theme === 'dark'} 
                  onClick={() => setTheme('dark')} 
                  icon={<Moon size={28} />} 
                  title="Dark Mode" 
                  desc="Easy on the eyes"
                />
                <ThemeCard 
                  active={theme === 'system'} 
                  onClick={() => setTheme('system')} 
                  icon={<Monitor size={28} />} 
                  title="System Default" 
                  desc="Matches your OS"
                />
              </div>
            </div>
          )}

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Cloud size={24} style={{ color: 'var(--accent-primary)' }}/> Cloud Synchronization
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                Your data is automatically synced in the background. If you are missing items or want to guarantee your local items are backed up right now, use the manual sync options.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <UploadCloud size={20} style={{ color: 'var(--accent-primary)' }}/> Force Push Local Data
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Uploads all local items on this device to the cloud.</p>
                  </div>
                  <button onClick={handlePush} disabled={!user} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UploadCloud size={18} /> Push Data
                  </button>
                </div>

                <div style={{ background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <DownloadCloud size={20} style={{ color: '#10b981' }}/> Force Pull Cloud Data
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Downloads all cloud items to this device.</p>
                  </div>
                  <button onClick={handlePull} disabled={!user} className="btn" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DownloadCloud size={18} /> Pull Data
                  </button>
                </div>
              </div>

              {syncMsg && (
                <div style={{ 
                  marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', fontWeight: 500, textAlign: 'center',
                  background: syncMsg.includes('❌') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  color: syncMsg.includes('❌') ? '#ef4444' : '#10b981',
                  border: `1px solid ${syncMsg.includes('❌') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                }}>
                  {syncMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left',
        padding: '1rem 1.25rem', borderRadius: '16px', fontWeight: 600, fontSize: '1rem',
        background: active ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
        border: 'none', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: active ? '0 8px 16px rgba(124, 58, 237, 0.2)' : 'none',
      }}
      onMouseOver={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-color)'; }}
      onMouseOut={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {icon} {label}
    </button>
  );
}

function ThemeCard({ active, onClick, icon, title, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        padding: '2rem 1.5rem', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s ease',
        background: active ? 'var(--bg-color)' : 'transparent',
        border: `2px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        boxShadow: active ? '0 8px 24px rgba(124, 58, 237, 0.15)' : 'none',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        position: 'relative', overflow: 'hidden'
      }}
      onMouseOver={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
      onMouseOut={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      {active && (
        <div style={{ position: 'absolute', top: '12px', right: '12px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }} />
      )}
      <div style={{ color: active ? 'var(--accent-primary)' : 'inherit' }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{desc}</div>
      </div>
    </button>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}
