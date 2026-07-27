import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, Search, BarChart2, PieChart, Shield, CheckCircle, Smartphone } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();
  const goToAuth = () => navigate('/auth');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <header className="neu-flat" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.5rem' }}>
          <Package size={28} /> Stash
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={() => navigate('/demo')}>See a Demo</button>
          <button className="btn btn-primary" onClick={goToAuth}>Get Started</button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        
        {/* Hero Section */}
        <section style={{ padding: '6rem 2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Stop buying things you <span style={{ color: 'var(--accent-primary)' }}>already own.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Stash helps you track everything you own, know its real cost, and compare before you buy. Know what you have, before you buy it again.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={goToAuth} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Sign Up Free</button>
            <button className="btn neu-convex" onClick={() => navigate('/demo')} style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Take the Tour</button>
          </div>
        </section>

        {/* Feature Highlights */}
        <section style={{ padding: '4rem 2rem', background: 'var(--shadow-light)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem' }}>Everything you need to master your inventory</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div className="card neu-flat">
                <Package size={32} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <h3>Track everything you own</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Create flexible categories for clothing, food, toiletries, medicine, or absolutely anything else.</p>
              </div>
              <div className="card neu-flat">
                <PieChart size={32} color="var(--accent-warning)" style={{ marginBottom: '1rem' }} />
                <h3>Know the real cost</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Calculate cost-per-use, cost-per-year, or custom formulas like protein per dollar.</p>
              </div>
              <div className="card neu-flat">
                <BarChart2 size={32} color="var(--accent-success)" style={{ marginBottom: '1rem' }} />
                <h3>Compare before you buy</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Pull up what you already own side-by-side with what you're considering buying.</p>
              </div>
              <div className="card neu-flat">
                <Search size={32} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <h3>Quick add</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Scan barcodes, snap a picture of a receipt, or just type a natural description.</p>
              </div>
              <div className="card neu-flat">
                <Shield size={32} color="var(--text-primary)" style={{ marginBottom: '1rem' }} />
                <h3>Your data, your control</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Stash is local-first by default. Your data stays on your device unless you opt into cloud sync.</p>
              </div>
              <div className="card neu-flat">
                <Smartphone size={32} color="var(--accent-danger)" style={{ marginBottom: '1rem' }} />
                <h3>Works anywhere</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Fully responsive and feels like a native app on your phone, with swipe gestures and pull-to-refresh.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem' }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-color)', padding: '1rem 2rem', borderRadius: '50px', boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)' }}>
              <span style={{ background: 'var(--accent-primary)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '500' }}>Add what you own</span>
            </div>
            <div style={{ width: '2px', height: '40px', background: 'var(--shadow-dark)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-color)', padding: '1rem 2rem', borderRadius: '50px', boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)' }}>
              <span style={{ background: 'var(--accent-warning)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '500' }}>Track cost & status</span>
            </div>
            <div style={{ width: '2px', height: '40px', background: 'var(--shadow-dark)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-color)', padding: '1rem 2rem', borderRadius: '50px', boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)' }}>
              <span style={{ background: 'var(--accent-success)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '500' }}>Search before you buy</span>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={{ padding: '6rem 2rem', background: 'var(--shadow-light)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Simple Pricing</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>More plans coming soon, but start organizing today for free.</p>
            
            <div className="card neu-flat" style={{ maxWidth: '400px', margin: '0 auto', padding: '3rem', borderTop: '4px solid var(--accent-primary)' }}>
              <h3>Basic</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0' }}>$0<span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} color="var(--accent-success)" /> Unlimited items</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} color="var(--accent-success)" /> Custom formulas</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} color="var(--accent-success)" /> Barcode scanning</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} color="var(--accent-success)" /> Local-first storage</li>
              </ul>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={goToAuth}>Get Started Free</button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem', textAlign: 'center' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card neu-flat">
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Is my data private?</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Yes. By default, Stash is entirely local-first. Your inventory data is stored directly in your browser. It only leaves your device if you explicitly enable Cloud Sync.</p>
            </div>
            <div className="card neu-flat">
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Does it work on mobile?</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Absolutely. The web app is fully responsive and feels like a native app on your phone, complete with swipe gestures and a bottom tab bar.</p>
            </div>
            <div className="card neu-flat">
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Can I use it for my specific hobby/category?</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Yes! Stash has a powerful custom category builder. You can define your own fields (text, numbers, dates) and even write custom math formulas for any category.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '4rem 2rem', background: 'var(--bg-color)', borderTop: '2px solid var(--shadow-light)', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Ready to take control of your inventory?</h2>
        <button className="btn btn-primary" onClick={goToAuth} style={{ padding: '1rem 2rem', fontSize: '1.1rem', marginBottom: '3rem' }}>Create Your Stash</button>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Stash. All rights reserved.</p>
      </footer>
    </div>
  );
}
