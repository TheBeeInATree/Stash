import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, PlusCircle, ArrowRight, BarChart2, CheckCircle, PieChart, ShoppingCart, Layers, Archive, MapPin, Settings, Cloud, Home } from 'lucide-react';

const mockItems = [
  { id: '1', name: 'Nike Air Force 1', status: 'in_use', price: 120, category: 'Clothing', uses: 47 },
  { id: '2', name: 'Sony WH-1000XM4', status: 'in_use', price: 348, category: 'Electronics', uses: 112 },
  { id: '3', name: 'Aesop Hand Wash', status: 'unopened', price: 39, category: 'Home', uses: 0 },
  { id: '4', name: 'Whey Protein 5lb', status: 'in_use', price: 55, category: 'Food', uses: 28 },
];

const mockShoppingList = [
  { id: '1', name: 'Laundry Detergent', checked: false, reason: 'Low stock' },
  { id: '2', name: 'Paper Towels', checked: true, reason: 'Low stock' },
  { id: '3', name: 'Vitamin C 1000mg', checked: false, reason: 'Expiring soon' },
];

const steps = [
  { label: 'Dashboard', icon: <Home size={14} /> },
  { label: 'Add Item', icon: <PlusCircle size={14} /> },
  { label: 'Compare', icon: <BarChart2 size={14} /> },
  { label: 'Insights', icon: <PieChart size={14} /> },
  { label: 'Shopping List', icon: <ShoppingCart size={14} /> },
  { label: 'Get Started', icon: <CheckCircle size={14} /> },
];

export function DemoWalkthrough() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState<string[]>(['2']);

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));

  const SidebarLink = ({ label, icon, active = false }: { label: string; icon: React.ReactNode; active?: boolean }) => (
    <div className={active ? 'btn btn-primary' : 'btn'} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default', opacity: active ? 1 : 0.7 }}>
      {icon} {label}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', position: 'relative' }}>

      {/* Progress Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem 2rem', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <Package size={20} /> Stash — Interactive Demo
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', opacity: i === step ? 1 : 0.5, fontWeight: i === step ? 'bold' : 'normal', cursor: i < step ? 'pointer' : 'default', transition: 'opacity 0.2s' }} onClick={() => i < step && setStep(i)}>
              {s.icon} <span className="desktop-only">{s.label}</span>
              {i < steps.length - 1 && <span style={{ opacity: 0.4, marginLeft: '0.25rem' }}>›</span>}
            </div>
          ))}
        </div>
        <button className="btn" onClick={() => navigate('/')} style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>Exit Demo</button>
      </div>

      <div style={{ paddingTop: '3.5rem', display: 'flex', minHeight: '100vh' }}>

        {/* Realistic Sidebar */}
        <nav className="desktop-sidebar neu-flat" style={{ width: '220px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRight: '2px solid var(--shadow-light)', flexShrink: 0 }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
            <Package size={22} /> Stash
          </h2>
          <SidebarLink label="Add Item" icon={<PlusCircle size={16} />} active={step === 1} />
          <SidebarLink label="Dashboard" icon={<Home size={16} />} active={step === 0} />
          <SidebarLink label="Shopping List" icon={<ShoppingCart size={16} />} active={step === 4} />
          <SidebarLink label="Compare" icon={<BarChart2 size={16} />} active={step === 2} />
          <SidebarLink label="Insights" icon={<PieChart size={16} />} active={step === 3} />
          <SidebarLink label="Categories" icon={<Settings size={16} />} />
          <SidebarLink label="Locations" icon={<MapPin size={16} />} />
          <SidebarLink label="Sets" icon={<Layers size={16} />} />
          <SidebarLink label="History" icon={<Archive size={16} />} />
          <SidebarLink label="Cloud Sync" icon={<Cloud size={16} />} />
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem', position: 'relative', overflow: 'hidden' }}>

          {/* Step 0: Dashboard */}
          {step === 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>Dashboard</h1>
                <div className="input neu-pressed" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '280px', padding: '0.6rem 1rem' }}>
                  <Search size={16} color="var(--text-secondary)" />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Search items, tags...</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {mockItems.map(item => (
                  <div key={item.id} className="card neu-flat" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.name}</h3>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: item.status === 'in_use' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: item.status === 'in_use' ? 'var(--accent-success)' : 'var(--accent-warning)', whiteSpace: 'nowrap' }}>{item.status.replace('_', ' ')}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>{item.category}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>${item.price}</span>
                      {item.uses > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>${(item.price / item.uses).toFixed(2)}/use</span>}
                    </div>
                  </div>
                ))}
              </div>

              <Tooltip title="Your stash Dashboard" desc="All your items in one place. See status, cost-per-use, and quick-edit prices directly on each card — no need to open an item to update it." onNext={nextStep} />
            </div>
          )}

          {/* Step 1: Add Item */}
          {step === 1 && (
            <div>
              <h1>Add Item</h1>
              <div className="card neu-flat" style={{ maxWidth: '580px', margin: '0 auto', padding: '2rem' }}>
                <h3 style={{ marginTop: 0 }}>Quick Add — Just Type Naturally</h3>
                <div className="input neu-pressed" style={{ padding: '1rem', marginBottom: '1rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                  Bought a Patagonia fleece for $129 at REI, size medium, navy blue
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>✨ Extract with AI</button>
                  <button className="btn" style={{ flex: 1 }}>📷 Scan Barcode</button>
                  <button className="btn" style={{ flex: 1 }}>🧾 Scan Receipt</button>
                </div>
                <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '1rem', boxShadow: 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parsed Result</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Name</span><span>Patagonia Fleece</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Price</span><span>$129.00</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Category</span><span>Clothing</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Tags</span><span>medium, navy</span>
                  </div>
                </div>
              </div>
              <Tooltip title="Lightning Fast Entry" desc="Type it how you'd say it, scan a barcode, or snap a receipt photo. Stash's AI parses the details automatically — name, price, category, and more." onNext={nextStep} position="top" />
            </div>
          )}

          {/* Step 2: Compare */}
          {step === 2 && (
            <div>
              <h1>Compare</h1>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch', marginTop: '1rem' }}>
                <div className="card neu-flat" style={{ flex: 1, border: '2px solid var(--accent-primary)' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Considering</p>
                  <h2 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>AirPods Pro 2</h2>
                  <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.5rem 0 1rem' }}>$249.00</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Apple • Noise Cancelling</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-color)', boxShadow: '5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>VS</div>
                </div>
                <div className="card neu-flat" style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>You Already Own</p>
                  <h2 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>Sony WH-1000XM4</h2>
                  <p style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0.5rem 0 1rem' }}>$348.00</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--accent-warning)', fontWeight: 'bold' }}>Status: In Use — 112 uses</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cost per use: $3.11</p>
                </div>
              </div>
              <Tooltip title="Compare Before You Buy" desc="Tempted by a sale? Pull up anything you already own side-by-side to make a smarter decision. See real cost-per-use to know if you really need a replacement." onNext={nextStep} position="top" />
            </div>
          )}

          {/* Step 3: Insights */}
          {step === 3 && (
            <div>
              <h1>Insights</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total stash Value', value: '$562', color: 'var(--accent-primary)' },
                  { label: 'Active Items', value: '3', color: 'var(--accent-success)' },
                  { label: 'Avg Cost / Use', value: '$2.14', color: 'var(--accent-warning)' },
                  { label: 'Low Stock Alerts', value: '2', color: 'var(--accent-danger)' },
                ].map(stat => (
                  <div key={stat.label} className="card neu-flat" style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.label}</p>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="card neu-flat" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0' }}>Spending by Category</h3>
                {[['Clothing', 60, 'var(--accent-primary)'], ['Electronics', 30, 'var(--accent-warning)'], ['Food', 10, 'var(--accent-success)']].map(([label, pct, color]) => (
                  <div key={label as string} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>{label as string}</span><span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--shadow-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color as string, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
              <Tooltip title="Smart Insights" desc="Stash automatically calculates your total inventory value, cost-per-use for every item, spending by category, and alerts you when stock is low or items are expiring." onNext={nextStep} position="top" />
            </div>
          )}

          {/* Step 4: Shopping List */}
          {step === 4 && (
            <div>
              <h1>Shopping List</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Automatically generated from low-stock and expiring items.</p>
              <div className="card neu-flat" style={{ maxWidth: '500px', padding: '1.5rem' }}>
                {mockShoppingList.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--shadow-light)' }}>
                    <div
                      style={{ width: '22px', height: '22px', borderRadius: '6px', border: '2px solid var(--accent-primary)', background: checkedItems.includes(item.id) ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                      onClick={() => setCheckedItems(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                    >
                      {checkedItems.includes(item.id) && <CheckCircle size={14} color="white" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, textDecoration: checkedItems.includes(item.id) ? 'line-through' : 'none', opacity: checkedItems.includes(item.id) ? 0.5 : 1 }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--accent-warning)' }}>{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Tooltip title="Smart Shopping List" desc="Stash automatically generates your shopping list from items that are running low or about to expire. Check things off as you shop." onNext={nextStep} position="top" />
            </div>
          )}

          {/* Step 5: CTA */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
              <CheckCircle size={72} color="var(--accent-success)" style={{ marginBottom: '1.5rem' }} />
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>You've seen everything!</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '480px', marginBottom: '2rem', lineHeight: 1.6 }}>
                Stop guessing what you own. Start managing your inventory with Stash — free, fast, and works offline.
              </p>
              <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate('/auth')}>
                Create Your Free Account <ArrowRight size={20} />
              </button>
              <button className="btn" style={{ marginTop: '1rem', color: 'var(--text-secondary)' }} onClick={() => navigate('/')}>
                Back to Homepage
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Tooltip({ title, desc, onNext, position = 'bottom' }: { title: string; desc: string; onNext: () => void; position?: 'top' | 'bottom' }) {
  return (
    <div className="neu-convex" style={{
      position: 'absolute',
      ...(position === 'bottom' ? { bottom: '2rem' } : { top: '7rem' }),
      right: '2rem',
      width: '300px',
      padding: '1.25rem',
      borderRadius: '14px',
      zIndex: 100,
      boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
    }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>{desc}</p>
      <button className="btn btn-primary" onClick={onNext} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
        Next <ArrowRight size={16} />
      </button>
    </div>
  );
}
