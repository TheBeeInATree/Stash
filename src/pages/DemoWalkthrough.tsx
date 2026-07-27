import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, PlusCircle, ArrowRight, BarChart2, CheckCircle } from 'lucide-react';

const mockItems = [
  { id: '1', name: 'Nike Air Force 1', status: 'in_use', price: 120, category: 'Clothing' },
  { id: '2', name: 'Sony WH-1000XM4', status: 'in_use', price: 348, category: 'Electronics' },
  { id: '3', name: 'Aesop Hand Wash', status: 'unopened', price: 39, category: 'Home' },
  { id: '4', name: 'Protein Powder', status: 'finished', price: 55, category: 'Food' },
];

export function DemoWalkthrough() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const nextStep = () => setStep(s => s + 1);
  const finishDemo = () => navigate('/');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', position: 'relative' }}>
      
      {/* Overlay Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--accent-primary)', color: 'white', padding: '1rem', textAlign: 'center', zIndex: 1000, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          Interactive Demo <span style={{ fontSize: '0.875rem', fontWeight: 'normal', opacity: 0.8 }}>(Step {step + 1} of 4)</span>
        </h3>
      </div>

      <div style={{ paddingTop: '4rem', height: '100vh', display: 'flex' }}>
        
        {/* Fake Sidebar */}
        <nav className="neu-flat" style={{ width: '250px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', borderRight: '2px solid var(--shadow-light)' }}>
          <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
            <Package /> Inventory
          </h2>
          <div className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            <PlusCircle size={20} /> Add Item
          </div>
          <div className="btn neu-pressed" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            Dashboard
          </div>
          <div className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            Compare
          </div>
          <div className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            Insights
          </div>
        </nav>

        {/* Fake Main Content */}
        <main style={{ flex: 1, padding: '2rem', position: 'relative' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1>{step === 2 ? 'Compare' : 'Dashboard'}</h1>
            {step !== 2 && (
              <div className="input neu-pressed" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <span style={{ color: 'var(--text-secondary)' }}>Search items, tags...</span>
              </div>
            )}
          </div>

          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
              {mockItems.map(item => (
                <div key={item.id} className="card neu-flat">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white' }}>{item.status.replace('_', ' ')}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{item.category}</p>
                  <p style={{ fontWeight: 'bold', marginTop: '1rem' }}>${item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="card neu-flat" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlusCircle /> Quick Add</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>You can scan a barcode, read a receipt, or just type freely.</p>
              <div className="input neu-pressed" style={{ padding: '1rem', marginBottom: '1rem' }}>
                Bought a new Hydroflask for $35 at Target today
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>Extract Details</button>
                <button className="btn" style={{ flex: 1 }}>Scan Barcode</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'stretch' }}>
              <div className="card neu-flat" style={{ flex: 1, border: '2px solid var(--accent-primary)' }}>
                <h3>Considering Buying</h3>
                <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>AirPods Pro</h2>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$249.00</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--bg-color)', boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)' }}>
                  VS
                </div>
              </div>
              <div className="card neu-flat" style={{ flex: 1, opacity: 0.8 }}>
                <h3>You Already Own</h3>
                <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>Sony WH-1000XM4</h2>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$348.00</p>
                <p style={{ color: 'var(--accent-warning)', fontWeight: 'bold', marginTop: '1rem' }}>Status: In Use (Since 2023)</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card neu-flat" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
              <CheckCircle size={64} color="var(--accent-success)" style={{ margin: '0 auto 1.5rem' }} />
              <h2>You're ready to go!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Stop buying things you already own. Start tracking your inventory locally, securely, and freely today.
              </p>
              <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', width: '100%' }} onClick={finishDemo}>
                Create Your Free Account
              </button>
            </div>
          )}

          {/* Tour Overlays & Next Buttons */}
          {step === 0 && (
            <div className="neu-convex" style={{ position: 'absolute', top: '150px', left: '30%', width: '300px', padding: '1.5rem', borderRadius: '12px', zIndex: 100 }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Your Dashboard</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                All your items live here. You can sort, filter, and quick-edit prices directly on the cards.
              </p>
              <button className="btn btn-primary" onClick={nextStep} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>Next <ArrowRight size={16} /></button>
            </div>
          )}

          {step === 1 && (
            <div className="neu-convex" style={{ position: 'absolute', top: '400px', left: '50%', transform: 'translateX(-50%)', width: '350px', padding: '1.5rem', borderRadius: '12px', zIndex: 100 }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Lightning Fast Entry</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Stash uses AI to parse your typed sentences or receipt images, automatically categorizing items and saving prices.
              </p>
              <button className="btn btn-primary" onClick={nextStep} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>Next <ArrowRight size={16} /></button>
            </div>
          )}

          {step === 2 && (
            <div className="neu-convex" style={{ position: 'absolute', top: '400px', left: '50%', transform: 'translateX(-50%)', width: '350px', padding: '1.5rem', borderRadius: '12px', zIndex: 100 }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Smart Comparisons</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Tempted by a sale? Pull up the Compare tool to see exactly what you already own in that category before pulling the trigger.
              </p>
              <button className="btn btn-primary" onClick={nextStep} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>Finish Demo <ArrowRight size={16} /></button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
