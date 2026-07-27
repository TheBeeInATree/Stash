import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category, type Item } from '../db';
import { evaluateFormula } from '../lib/evaluator';
import { PieChart, TrendingUp, DollarSign, AlertCircle, Award, BarChart2, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryIcon } from '../lib/categoryIcons';
import { getItemLifespanYears } from '../lib/metrics';

export function Insights() {
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');

  const categories = useLiveQuery(() => db.categories.toArray());
  const allItems = useLiveQuery(() => db.items.toArray());
  const allFormulas = useLiveQuery(() => db.formulas.toArray());

  if (!categories || !allItems || !allFormulas) {
    return <div style={{ padding: '2rem' }}>Loading Insights...</div>;
  }

  // --- Helpers ---
  const ownedItems = allItems.filter(i => i.status !== 'considering');

  const getCategorySpend = (catId: string) => {
    return ownedItems.filter(i => i.categoryId === catId).reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  };

  const getCategoryYearlySpend = (catId: string) => {
    const cItems = ownedItems.filter(i => i.categoryId === catId);
    if (cItems.length === 0) return 0;
    let minTime = Date.now();
    let maxTime = Date.now();
    let totalSpend = 0;
    cItems.forEach(i => {
      totalSpend += i.purchasePrice || 0;
      const t = i.purchaseDate || i.createdAt;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    });
    const timeSpanMs = maxTime - minTime;
    const timeSpanYears = Math.max(0.1, timeSpanMs / (1000 * 60 * 60 * 24 * 365));
    return totalSpend / timeSpanYears;
  };

  const getMonthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  };

  const getYearStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), 0, 1).getTime();
  };

  const getCategoryPeriodSpend = (catId: string, period: 'monthly' | 'yearly') => {
    const start = period === 'monthly' ? getMonthStart() : getYearStart();
    return ownedItems
      .filter(i => i.categoryId === catId && (i.purchaseDate || i.createdAt) >= start)
      .reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  };

  // --- Cross-Category View Calculations ---
  const totalSpendAll = categories.reduce((sum, cat) => sum + getCategoryYearlySpend(cat.id), 0);
  
  const categoriesWithSpend = categories.map(cat => ({
    cat,
    spend: getCategoryYearlySpend(cat.id),
    periodSpend: cat.budget ? getCategoryPeriodSpend(cat.id, cat.budget.period) : 0
  })).sort((a, b) => b.spend - a.spend);

  const highestSpendCategory = categoriesWithSpend.length > 0 ? categoriesWithSpend[0] : null;

  // --- Specific Category View Calculations ---
  const selectedCat = categories.find(c => c.id === selectedCategoryId);
  const catItems = ownedItems.filter(i => i.categoryId === selectedCategoryId);
  const catFormulas = allFormulas.filter(f => f.categoryId === selectedCategoryId);

  let totalCatSpend = 0;
  let avgPerMonth = 0;
  let avgPerYear = 0;
  let topExpensive: Item[] = [];
  let monthlyBuckets: { label: string, spend: number, timestamp: number }[] = [];
  let maxBucketSpend = 1;
  let tagMetrics: { tag: string, totalSpend: number, avgPerYear: number, itemCount: number }[] = [];

  if (selectedCat && catItems.length > 0) {
    let minTime = Date.now();
    let maxTime = Date.now();
    catItems.forEach(i => {
      const t = i.purchaseDate || i.createdAt;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    });

    const timeSpanMs = maxTime - minTime;
    const timeSpanMonths = Math.max(1, timeSpanMs / (1000 * 60 * 60 * 24 * 30.44));
    const timeSpanYears = Math.max(0.1, timeSpanMs / (1000 * 60 * 60 * 24 * 365));

    totalCatSpend = catItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
    avgPerMonth = totalCatSpend / timeSpanMonths;
    avgPerYear = totalCatSpend / timeSpanYears;

    topExpensive = [...catItems]
      .filter(i => i.purchasePrice !== null)
      .sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0))
      .slice(0, 5);

    // Group by month for chart
    const startMonth = new Date(minTime);
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const endMonth = new Date(maxTime);
    endMonth.setDate(1);
    endMonth.setHours(0, 0, 0, 0);

    let currentMonth = new Date(startMonth.getTime());
    // Ensure we always show at least the current month even if no items
    if (currentMonth.getTime() === endMonth.getTime()) {
        monthlyBuckets.push({ label: currentMonth.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), spend: 0, timestamp: currentMonth.getTime() });
    } else {
        while (currentMonth <= endMonth) {
        const label = currentMonth.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        const ts = currentMonth.getTime();
        monthlyBuckets.push({ label, spend: 0, timestamp: ts });
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
    }

    catItems.forEach(item => {
      if (!item.purchasePrice) return;
      const itemDate = new Date(item.purchaseDate || item.createdAt);
      const label = itemDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      const bucket = monthlyBuckets.find(b => b.label === label);
      if (bucket) {
        bucket.spend += item.purchasePrice;
      }
    });

    maxBucketSpend = Math.max(...monthlyBuckets.map(b => b.spend), 1);

    // Calculate tag metrics
    const tagsSet = new Set<string>();
    catItems.forEach(i => {
      i.tags.forEach(t => tagsSet.add(t));
    });

    tagMetrics = Array.from(tagsSet).map(tag => {
      const tItems = catItems.filter(i => i.tags.includes(tag));
      const total = tItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
      
      let minT = Date.now();
      let maxT = Date.now();
      tItems.forEach(i => {
        const t = i.purchaseDate || i.createdAt;
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      });

      const spanMs = maxT - minT;
      const spanYears = Math.max(0.1, spanMs / (1000 * 60 * 60 * 24 * 365));
      const avgYearly = total / spanYears;

      return {
        tag,
        totalSpend: total,
        avgPerYear: avgYearly,
        itemCount: tItems.length
      };
    }).sort((a, b) => b.avgPerYear - a.avgPerYear);
  }

  // Value evaluation logic
  const getItemUsageCount = (item: Item) => item.statusHistory.filter(s => s.status === 'in_use').length || 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <PieChart size={28} color="var(--accent-primary)" /> Spending Insights
        </h1>
        <select 
          className="input neu-pressed" 
          value={selectedCategoryId} 
          onChange={e => setSelectedCategoryId(e.target.value)}
          style={{ width: '250px', fontSize: '1rem', padding: '0.5rem 1rem' }}
        >
          <option value="all">All Categories (Overview)</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{getCategoryIcon(cat.name, cat.icon)} {cat.name}</option>
          ))}
        </select>
      </div>

      {selectedCategoryId === 'all' ? (
        // CROSS-CATEGORY VIEW
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-primary)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Est. Total Yearly Spend</h3>
              <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                ${totalSpendAll.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ yr</span>
              </p>
            </div>
            
            {highestSpendCategory && highestSpendCategory.spend > 0 && (
              <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-warning)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Highest Yearly Spend</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '2.5rem' }}>{getCategoryIcon(highestSpendCategory.cat.name, highestSpendCategory.cat.icon)}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.25rem' }}>{highestSpendCategory.cat.name}</p>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>${highestSpendCategory.spend.toFixed(2)} / yr</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <h2 style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={24} color="var(--accent-primary)" /> Category Breakdown & Budgets
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {categoriesWithSpend.map(({ cat, spend, periodSpend }) => {
              const hasBudget = !!cat.budget;
              const budgetAmount = cat.budget?.amount || 1;
              const percentUsed = hasBudget ? (periodSpend / budgetAmount) * 100 : 0;
              const isOver = percentUsed > 100;
              
              return (
                <div key={cat.id} className="card neu-flat" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem' }}>
                  <div style={{ width: '200px', cursor: 'pointer' }} onClick={() => setSelectedCategoryId(cat.id)}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{getCategoryIcon(cat.name, cat.icon)} {cat.name}</h3>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>${spend.toFixed(2)} / yr</p>
                  </div>
                  
                  {hasBudget ? (
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <span>
                          <strong>${periodSpend.toFixed(2)}</strong> spent this {cat.budget!.period === 'monthly' ? 'month' : 'year'}
                        </span>
                        <span style={{ color: isOver ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                          Budget: ${budgetAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="neu-pressed" style={{ height: '12px', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, left: 0, bottom: 0, 
                          width: `${Math.min(percentUsed, 100)}%`, 
                          backgroundColor: isOver ? 'var(--accent-danger)' : 'var(--accent-success)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      {isOver && (
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--accent-danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle size={12} /> Over budget by ${(periodSpend - budgetAmount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      No budget set for this category. Edit category to add a budget.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        // PER-CATEGORY DEEP DIVE
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div className="card neu-flat">
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Lifetime Category Spend</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>${totalCatSpend.toFixed(2)}</p>
            </div>
            <div className="card neu-flat">
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Avg. Spend Rate</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>${avgPerMonth.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ mo</span></p>
              <p style={{ fontSize: '1rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>${avgPerYear.toFixed(2)} / yr</p>
            </div>
            {selectedCat?.budget && (
              <div className="card neu-flat" style={{ borderTop: '4px solid var(--accent-primary)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{selectedCat.budget.period} Budget</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--accent-primary)' }}>${selectedCat.budget.amount.toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="card neu-flat">
            <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={24} color="var(--accent-primary)" /> Spend Over Time
            </h2>
            
            <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginTop: '2rem', position: 'relative' }}>
              {monthlyBuckets.map((b, i) => {
                const heightPct = (b.spend / maxBucketSpend) * 100;
                return (
                  <div key={i} className="group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: '100%', 
                      height: `${heightPct}%`, 
                      minHeight: b.spend > 0 ? '4px' : '0px',
                      backgroundColor: 'var(--accent-primary)', 
                      borderRadius: '4px 4px 0 0',
                      opacity: 0.8,
                      position: 'relative'
                    }}>
                      <div className="tooltip" style={{ 
                        position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', 
                        background: 'var(--text-primary)', color: 'var(--bg-color)', padding: '4px 8px', 
                        borderRadius: '4px', fontSize: '0.75rem', opacity: 0, transition: 'opacity 0.2s',
                        pointerEvents: 'none', whiteSpace: 'nowrap'
                      }}>
                        ${b.spend.toFixed(2)}
                      </div>
                    </div>
                    {/* Render label every few items if too many, or all if few */}
                    {(monthlyBuckets.length < 12 || i % Math.ceil(monthlyBuckets.length / 12) === 0) && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', transform: 'rotate(-45deg)', transformOrigin: 'top left', marginTop: '0.5rem' }}>
                        {b.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Adding a global style for the hover tooltip logic since inline hover isn't possible */}
            <style>{`
              div[style*="height:"] > div.tooltip { opacity: 0; }
              div[style*="height:"]:hover > div.tooltip { opacity: 1; }
            `}</style>
          </div>

          {tagMetrics.length > 0 && (
            <div className="card neu-flat">
              <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="var(--accent-primary)" /> Tag Breakdown (Est. Yearly Spend)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                {tagMetrics.map(m => (
                  <div 
                    key={m.tag} 
                    className="neu-convex" 
                    style={{ padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.1s ease' }}
                    onClick={() => navigate(`/?q=${encodeURIComponent(m.tag)}`)}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>#{m.tag}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--shadow-light)', padding: '2px 6px', borderRadius: '12px' }}>{m.itemCount} items</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', color: 'var(--accent-primary)', fontSize: '1.25rem', fontWeight: 'bold' }}>
                      ${m.avgPerYear.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ yr</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      ${m.totalSpend.toFixed(2)} total spend
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="card neu-flat">
              <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} color="var(--accent-primary)" /> Most Expensive Items
              </h2>
              {topExpensive.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {topExpensive.map(item => (
                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--shadow-light)' }}>
                      <span style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => navigate(`/item/${item.id}`)}>{item.name}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>${item.purchasePrice!.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No items with prices recorded yet.</p>
              )}
            </div>

            {catFormulas.map(formula => {
              const evaluatedItems = catItems.map(item => {
                const estVars = {
                  ...item.fields,
                  purchasePrice: item.purchasePrice || 0,
                  price: item.purchasePrice || 0,
                  itemCost: item.purchasePrice || 0,
                  cost: item.purchasePrice || 0,
                  usageCount: getItemUsageCount(item),
                  uses: getItemUsageCount(item),
                  lifespanYears: getItemLifespanYears(item),
                  lifespan: getItemLifespanYears(item)
                };
                const estVal = evaluateFormula(formula.expression, estVars);
                
                let loggedVal = null;
                if (item.trackUsage && item.usageLog && item.usageLog.length > 0) {
                  const totalQuantity = item.usageLog.reduce((sum, log) => sum + (log.quantityUsed || 0), 0);
                  const loggedUses = totalQuantity > 0 ? totalQuantity : item.usageLog.length;
                  const loggedVars = { ...estVars, usageCount: loggedUses, uses: loggedUses };
                  loggedVal = evaluateFormula(formula.expression, loggedVars);
                }

                // If loggedVal is valid, it becomes the primary 'value' used for ranking
                const rankValue = (loggedVal !== null && !isNaN(loggedVal as number)) ? loggedVal : estVal;
                
                return {
                  item,
                  value: rankValue,
                  estVal,
                  loggedVal,
                  showDual: loggedVal !== null && loggedVal !== estVal
                };
              }).filter(res => res.value !== null && !isNaN(res.value as number)) as {item: Item, value: number, estVal: number, loggedVal: number | null, showDual: boolean}[];

              if (evaluatedItems.length === 0) return null;

              evaluatedItems.sort((a, b) => a.value - b.value);
              const isCostFormula = formula.name.toLowerCase().includes('cost');
              // If it's a cost formula (e.g. Cost per Wear), lower is better. 
              // Otherwise (e.g. Value Score), higher is better.
              const bestItem = isCostFormula ? evaluatedItems[0] : evaluatedItems[evaluatedItems.length - 1];
              const worstItem = isCostFormula ? evaluatedItems[evaluatedItems.length - 1] : evaluatedItems[0];

              return (
                <div key={formula.id} className="card neu-flat">
                  <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={20} color="var(--accent-primary)" /> Value: {formula.name}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', borderLeft: '4px solid var(--accent-success)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Best Value</div>
                        <div style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate(`/item/${bestItem.item.id}`)}>{bestItem.item.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {bestItem.showDual ? (
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Est.</div>
                              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{bestItem.estVal.toFixed(2)}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Log.</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{bestItem.loggedVal!.toFixed(2)}</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{bestItem.value.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                    
                    {evaluatedItems.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', borderLeft: '4px solid var(--accent-danger)' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Worst Value</div>
                          <div style={{ fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate(`/item/${worstItem.item.id}`)}>{worstItem.item.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {worstItem.showDual ? (
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                              <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Est.</div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{worstItem.estVal.toFixed(2)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Log.</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-danger)' }}>{worstItem.loggedVal!.toFixed(2)}</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-danger)' }}>{worstItem.value.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
