import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Save, AlertCircle, Zap, Camera, ScanText, ShoppingCart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFullLocationPath } from './Locations';
import nlp from 'compromise';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { lookupBarcode } from '../lib/barcodeLookup';
import { ReceiptReviewModal } from '../components/ReceiptReviewModal';
import { parseReceiptImage, type ParsedLineItem } from '../lib/receiptParser';
import { DateInput } from '../components/DateInput';

export function AddItem() {
  const navigate = useNavigate();
  const categories = useLiveQuery(() => db.categories.toArray());
  const allItems = useLiveQuery(() => db.items.toArray());
  const locations = useLiveQuery(() => db.locations.toArray());
  
  const [quickAddText, setQuickAddText] = useState('');
  const [resetKey, setResetKey] = useState(0);
  
  const location = useLocation();
  const duplicateFrom = location.state?.duplicateFrom;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(duplicateFrom ? duplicateFrom.categoryId : '');
  
  // Basic Fields
  const [name, setName] = useState(duplicateFrom ? duplicateFrom.name : '');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState(duplicateFrom ? duplicateFrom.tags.join(', ') : '');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(duplicateFrom ? (duplicateFrom.locationId || '') : '');
  const [barcodeState, setBarcodeState] = useState(duplicateFrom ? (duplicateFrom.barcode || '') : '');

  // Custom Fields
  const [customFields, setCustomFields] = useState<Record<string, any>>(duplicateFrom ? { ...duplicateFrom.fields } : {});
  const [isGroup, setIsGroup] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [trackUsage, setTrackUsage] = useState(false);

  // Matching Engine States
  const [tightMatchItem, setTightMatchItem] = useState<any>(null);
  const [tightMatchResolved, setTightMatchResolved] = useState(false);
  const [intendedLinkId, setIntendedLinkId] = useState<string | null>(null);
  const [looseMatches, setLooseMatches] = useState<Array<{ item: any, reasons: string[], score: number }>>([]);

  // Scanners
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  const [isReceiptScanning, setIsReceiptScanning] = useState(false);
  const [receiptParsedItems, setReceiptParsedItems] = useState<ParsedLineItem[] | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Debounced Effect for Live Matching
  useEffect(() => {
    if (!name || !selectedCategoryId || !allItems) {
      setTightMatchItem(null);
      setLooseMatches([]);
      return;
    }
    
    const timer = setTimeout(() => {
      let foundTight = null;
      let newLooseMatches: Array<{ item: any, reasons: string[], score: number }> = [];

      const categoryItems = allItems.filter(i => i.categoryId === selectedCategoryId);
      const nameWords = name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const inputTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

      for (const item of categoryItems) {
        // 1. Tight Match Check
        if (!foundTight && (item.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(item.name.toLowerCase()))) {
          foundTight = item;
          continue; // Skip tight match from loose logic
        }

        // 2. Loose Match Check
        let score = 0;
        let reasons: string[] = [];

        // Check name words overlap
        const itemNameWords = item.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const sharedWords = nameWords.filter(w => itemNameWords.includes(w));
        if (sharedWords.length > 0) {
          score += sharedWords.length;
          reasons.push(`Similar name`);
        }

        // Check tags overlap
        if (item.tags && item.tags.length > 0) {
          const itemTags = item.tags.map(t => t.toLowerCase());
          const sharedTags = inputTags.filter(t => itemTags.includes(t));
          if (sharedTags.length > 0) {
            score += sharedTags.length;
            reasons.push(`Shared tag: ${sharedTags.join(', ')}`);
          }
        }

        // Check custom fields overlap
        if (item.fields) {
          for (const [k, v] of Object.entries(item.fields)) {
            if (v !== undefined && v !== '' && customFields[k] !== undefined && String(customFields[k]).toLowerCase() === String(v).toLowerCase()) {
              score += 1;
              reasons.push(`Shared field: ${k}`);
            }
          }
        }

        const isArchived = item.status === 'finished' || item.status === 'discarded';
        if (score > 0 && !isArchived) {
          newLooseMatches.push({ item, reasons, score });
        }
      }

      if (foundTight?.id !== tightMatchItem?.id) {
         setTightMatchResolved(false);
         setIntendedLinkId(null);
      }
      
      setTightMatchItem(foundTight);
      setLooseMatches(newLooseMatches.sort((a, b) => b.score - a.score).slice(0, 5));

    }, 500);

    return () => clearTimeout(timer);
  }, [name, tags, customFields, selectedCategoryId, allItems, tightMatchItem?.id]);

  // Natural Language Quick Add Effect
  useEffect(() => {
    if (!quickAddText.trim()) return;
    
    const timer = setTimeout(() => {
      const doc = nlp(quickAddText);
      let tempName = quickAddText;

      // 1. Extract Price
      const moneyMatches = doc.money();
      if (moneyMatches.found) {
        const mStr = moneyMatches.out('array')[0];
        if (mStr) {
          const numMatch = mStr.match(/\b(\d+(?:\.\d+)?)\b/);
          if (numMatch) {
            setPurchasePrice(numMatch[1]);
            tempName = doc.not(moneyMatches).out('text');
          }
        }
      }

      // 2. Extract Quantity
      const numDoc = nlp(tempName);
      const numbers = numDoc.numbers();
      if (numbers.found) {
        // just grab first number found
        const numStr = numbers.out('array')[0];
        if (numStr) {
          const qty = parseInt(numStr.replace(/[^\d]/g, ''), 10);
          if (qty && qty > 0) {
            setQuantity(qty.toString());
            if (qty > 1) setIsGroup(true);
            tempName = numDoc.not(numbers).out('text');
          }
        }
      }

      // 3. Extract Category
      let matchedCategory = null;
      if (categories) {
        for (const cat of categories) {
          const catRegex = new RegExp(`\\b${cat.name}\\b`, 'i');
          if (catRegex.test(tempName)) {
            matchedCategory = cat;
            setSelectedCategoryId(cat.id);
            tempName = tempName.replace(catRegex, '').trim();
            break;
          }
        }
      }

      // clean up glue words
      tempName = tempName.replace(/\b(in|for)\b/gi, '').trim();

      // 4. Extract Custom Fields
      if (matchedCategory) {
        let remainingFieldsText = tempName;
        const newCustomFields = { ...customFields };
        let foundAnyField = false;

        matchedCategory.fieldTemplate.forEach(field => {
          if (field.type === 'dropdown' && field.options) {
            for (const opt of field.options) {
              const optRegex = new RegExp(`\\b${opt}\\b`, 'i');
              if (optRegex.test(remainingFieldsText)) {
                newCustomFields[field.name] = opt;
                remainingFieldsText = remainingFieldsText.replace(optRegex, '').trim();
                foundAnyField = true;
                break;
              }
            }
          }
        });

        if (foundAnyField) {
          setCustomFields(newCustomFields);
          tempName = remainingFieldsText;
        }
      }

      // 5. Cleanup the Name
      const finalDoc = nlp(tempName);
      let finalName = finalDoc.nouns().out('text') || tempName; 
      finalName = finalName.replace(/\s+/g, ' ').trim();
      
      // Capitalize first letter
      if (finalName) {
        finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
      }

      if (finalName) {
        setName(finalName);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [quickAddText, categories]);

  const handleBarcodeResult = (decodedText: string) => {
    // Example lookup using external API or local db
    alert(`Barcode ${decodedText} scanned. Ready for manual entry.`);
    setBarcodeState(decodedText);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReceiptScanning(true);
    try {
      const parsed = await parseReceiptImage(file);
      setReceiptParsedItems(parsed);
    } catch (err) {
      console.error(err);
      alert('Failed to parse receipt text.');
    } finally {
      setIsReceiptScanning(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  };

  const handleReceiptSave = async (items: ParsedLineItem[], globalCategoryId: string) => {
    setReceiptParsedItems(null);
    const now = Date.now();
    
    const newItems = items.map(item => ({
       id: uuidv4(),
       name: item.name,
       categoryId: globalCategoryId,
       groupId: null,
       locationId: selectedLocationId || null,
       productLinkId: null,
       photo: null,
       fields: {},
       tags: [],
       trackUsage: false,
       barcode: null,
       purchaseDate: now,
       purchasePrice: item.price,
       status: 'unopened' as const,
       statusHistory: [{ status: 'unopened' as const, timestamp: now }],
       createdAt: now,
       updatedAt: now,
    }));
    await db.items.bulkAdd(newItems);
    alert(`Successfully added ${newItems.length} items from receipt!`);
    navigate('/');
  };

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleAutofill = (targetItem: any) => {
    if (targetItem.tags) setTags(targetItem.tags.join(', '));
    if (targetItem.locationId) setSelectedLocationId(targetItem.locationId);
    if (targetItem.fields) setCustomFields({ ...targetItem.fields });
  };

  const handleSave = async (asConsidering = false) => {
    if (!name || !selectedCategoryId) return alert('Name and Category are required');
    if (tightMatchItem && !tightMatchResolved) return alert('Please resolve the exact match prompt first.');

    await performSave(intendedLinkId, asConsidering);
  };

  const performSave = async (linkId: string | null, asConsidering = false) => {
    const now = Date.now();
    const parsedPrice = purchasePrice ? parseFloat(purchasePrice) : null;
    const parsedDate = purchaseDate ? new Date(purchaseDate).getTime() : null;
    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    const qty = parseInt(quantity, 10) || 1;
    const parsedLowStock = lowStockThreshold ? parseInt(lowStockThreshold, 10) : null;
    
    const initStatus: 'considering' | 'unopened' = asConsidering ? 'considering' : 'unopened';

    let groupId: string | null = null;

    if (!isGroup && qty > 1) {
       customFields['quantity'] = qty;
       await db.items.add({
          id: uuidv4(),
          name,
          categoryId: selectedCategoryId,
          groupId: null,
          locationId: selectedLocationId || null,
          productLinkId: linkId,
          photo: null,
          fields: customFields,
          tags: tagsArray,
          trackUsage,
          usageLog: trackUsage ? [] : undefined,
          barcode: barcodeState || null,
          lowStockThreshold: parsedLowStock,
          originalQuantity: qty,
          purchaseDate: parsedDate,
          purchasePrice: parsedPrice,
          status: initStatus,
          statusHistory: [{ status: initStatus as any, timestamp: now }],
          createdAt: now,
          updatedAt: now,
       });
    } else {
       let groupId: string | null = null;
       if (qty > 1) {
         groupId = isGroup ? uuidv4() : null;
         if (groupId) {
           await db.groups.add({
             id: groupId,
             name: `${name} Group`,
             categoryId: selectedCategoryId,
             createdAt: now,
             updatedAt: now
           });
         }
       }

       const perUnitPrice = parsedPrice !== null ? Number((parsedPrice / qty).toFixed(2)) : null;

       const newItems = Array.from({ length: qty }).map((_, i) => ({
          id: uuidv4(),
          name: qty > 1 ? `${name} #${i+1}` : name,
          categoryId: selectedCategoryId,
          groupId,
          locationId: selectedLocationId || null,
          productLinkId: linkId,
          photo: null,
          fields: customFields,
          tags: tagsArray,
          trackUsage,
          usageLog: trackUsage ? [] : undefined,
          barcode: barcodeState || null,
          lowStockThreshold: parsedLowStock,
          originalQuantity: 1,
          purchaseDate: parsedDate,
          purchasePrice: perUnitPrice,
          status: initStatus,
          statusHistory: [{ status: initStatus as any, timestamp: now }],
          createdAt: now,
          updatedAt: now,
       }));
       await db.items.bulkAdd(newItems);
    }
    
    setName('');
    setTags('');
    setPurchasePrice('');
    setPurchaseDate('');
    setCustomFields({});
    setIsGroup(false);
    setQuantity('1');
    setLowStockThreshold('');
    setTrackUsage(false);
    setResetKey(prev => prev + 1);
    
    navigate('/');
  };

  return (
    <div key={resetKey} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>Add Item</h1>
      <div className="card neu-flat" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
        
        <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--accent-primary)' }} className="neu-convex">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
            <Zap size={18} /> Quick Add Options
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              className="input neu-pressed" 
              value={quickAddText} 
              onChange={e => setQuickAddText(e.target.value)} 
              placeholder="Try: '18 Oikos Yogurts in Protein items for 14 dollars'" 
              style={{ fontSize: '1rem', padding: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn neu-pressed" onClick={() => setShowBarcodeScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={16} /> Scan Barcode
              </button>
              <button type="button" className="btn neu-pressed" onClick={() => receiptInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ScanText size={16} /> Scan Receipt
              </button>
              <input type="file" accept="image/*" ref={receiptInputRef} onChange={handleReceiptFileChange} style={{ display: 'none' }} />
              
              {isLookupLoading && <span style={{ color: 'var(--text-secondary)', alignSelf: 'center', fontSize: '0.875rem' }}>Looking up barcode...</span>}
              {isReceiptScanning && <span style={{ color: 'var(--text-secondary)', alignSelf: 'center', fontSize: '0.875rem' }}>Processing receipt...</span>}
            </div>
          </div>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Type a description, or scan a barcode/receipt to fill out the form automatically!
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--shadow-light)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or Fill Manually</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--shadow-light)' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Category *</label>
          <select className="input neu-pressed" value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
            <option value="">Select a category...</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name *</label>
          <input className="input neu-pressed" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Winter Jacket" />
        </div>

        {(tightMatchItem || looseMatches.length > 0) && (
          <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--shadow-dark)' }} className="neu-convex">
            
            {tightMatchItem && (
              <div style={{ marginBottom: looseMatches.length > 0 ? '1rem' : 0, paddingBottom: looseMatches.length > 0 ? '1rem' : 0, borderBottom: looseMatches.length > 0 ? '1px solid var(--shadow-dark)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <AlertCircle size={24} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '0.25rem' }} />
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)' }}>Exact Match Found</h3>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>This looks like the same product as <strong>{tightMatchItem.name}</strong>. Would you like to link their price history together?</p>
                    
                    {!tightMatchResolved ? (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                          className="btn btn-primary" 
                          onClick={async () => {
                            let linkId = tightMatchItem.productLinkId;
                            if (!linkId) {
                              linkId = uuidv4();
                              await db.items.update(tightMatchItem.id, { productLinkId: linkId, updatedAt: Date.now() });
                            }
                            setIntendedLinkId(linkId);
                            setTightMatchResolved(true);
                            handleAutofill(tightMatchItem);
                          }}
                        >
                          Yes, Link Them
                        </button>
                        <button 
                          className="btn neu-pressed" 
                          onClick={() => {
                            setIntendedLinkId(null);
                            setTightMatchResolved(true);
                          }}
                        >
                          No, Skip
                        </button>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {intendedLinkId ? '✓ Will link price history upon save' : '✓ Skipping price history link'}
                        <button className="btn neu-pressed" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setTightMatchResolved(false)}>Undo</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {looseMatches.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>You also own similar items:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {looseMatches.map(lm => (
                    <div 
                      key={lm.item.id} 
                      className="neu-flat" 
                      style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px' }} 
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, cursor: 'pointer' }} onClick={() => window.open(`/item/${lm.item.id}`, '_blank')} title="Open in new tab">
                        <strong style={{ fontSize: '0.875rem' }}>{lm.item.name}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {lm.reasons.map((r, i) => (
                            <span key={i} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--shadow-light)', borderRadius: '4px', color: 'var(--text-secondary)' }}>{r}</span>
                          ))}
                        </div>
                      </div>
                      <button className="btn neu-pressed" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', flexShrink: 0, marginLeft: '1rem' }} onClick={() => handleAutofill(lm.item)}>
                        Copy Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Purchase Price</label>
            <input type="number" step="0.01" className="input neu-pressed" defaultValue={purchasePrice} onBlur={e => setPurchasePrice(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Purchase Date</label>
            <DateInput className="input neu-pressed" value={purchaseDate} onChange={setPurchaseDate} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tags</label>
          <input className="input neu-pressed" defaultValue={tags} onBlur={e => setTags(e.target.value)} placeholder="e.g. winter, gift (comma separated)" />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Location</label>
          <select className="input neu-pressed" value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)}>
            <option value="">Unassigned</option>
            {locations?.map(l => (
              <option key={l.id} value={l.id}>{getFullLocationPath(locations, l.id)}</option>
            ))}
          </select>
        </div>

        {selectedCategory && selectedCategory.fieldTemplate.length > 0 && (
          <div style={{ padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '12px', marginTop: '1rem' }} className="neu-convex">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} color="var(--accent-primary)" /> Category Specific Fields
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {selectedCategory.fieldTemplate.map(field => (
                <div key={field.name}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    {field.name} {field.required && '*'}
                  </label>
                  {field.type === 'dropdown' ? (
                    <select className="input neu-pressed" value={customFields[field.name] || ''} onChange={e => handleCustomFieldChange(field.name, e.target.value)}>
                      <option value="">Select...</option>
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <input type="checkbox" checked={!!customFields[field.name]} onChange={e => handleCustomFieldChange(field.name, e.target.checked)} />
                  ) : field.type === 'date' ? (
                    <DateInput 
                      className="input neu-pressed" 
                      value={customFields[field.name] || ''} 
                      onChange={val => handleCustomFieldChange(field.name, val)} 
                    />
                  ) : (
                    <input 
                      type={field.type === 'number' || field.type === 'currency' || field.type === 'weight' || field.type === 'volume' || field.type === 'count' ? 'number' : 'text'}
                      className="input neu-pressed" 
                      defaultValue={customFields[field.name] || ''} 
                      onBlur={e => handleCustomFieldChange(field.name, e.target.value)} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '1.5rem', border: '1px solid var(--shadow-dark)', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0 }}>Grouping & Tracking</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'block', fontWeight: 600 }}>Quantity:</label>
            <input type="number" min="1" className="input neu-pressed" style={{ width: '100px' }} value={quantity} onChange={e => setQuantity(e.target.value)} />
            
            <label style={{ display: 'block', fontWeight: 600, marginLeft: 'auto' }}>Low Stock Alert at:</label>
            <input type="number" min="0" placeholder="Default (20%)" className="input neu-pressed" style={{ width: '130px' }} value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)} />
          </div>
          {parseInt(quantity, 10) > 1 && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" checked={!isGroup} onChange={() => setIsGroup(false)} />
                Single entry with quantity field
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" checked={isGroup} onChange={() => setIsGroup(true)} />
                Individual linked entries
              </label>
            </div>
          )}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--shadow-light)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={trackUsage} onChange={e => setTrackUsage(e.target.checked)} />
              Track individual uses
            </label>
            <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Enables logging each time you use this item, allowing for actual cost-per-use tracking.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (tightMatchItem && !tightMatchResolved) ? 0.5 : 1 }} 
            disabled={!!(tightMatchItem && !tightMatchResolved)}
            onClick={() => handleSave(false)}
          >
            <Save size={20} /> Save Item
          </button>
          
          <button 
            className="btn neu-pressed" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (tightMatchItem && !tightMatchResolved) ? 0.5 : 1 }} 
            disabled={!!(tightMatchItem && !tightMatchResolved)}
            onClick={() => handleSave(true)}
          >
            <ShoppingCart size={20} /> Add to Shopping List
          </button>
        </div>

      </div>
      
      {showBarcodeScanner && (
        <BarcodeScannerModal 
          onClose={() => setShowBarcodeScanner(false)} 
          onScan={handleBarcodeResult} 
        />
      )}
      
      {receiptParsedItems && (
        <ReceiptReviewModal
          initialItems={receiptParsedItems}
          categories={categories || []}
          onClose={() => setReceiptParsedItems(null)}
          onSave={handleReceiptSave}
        />
      )}
    </div>
  );
}
