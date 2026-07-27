import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category, type FieldTemplate, type Formula } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { getCategoryIcon } from '../lib/categoryIcons';

const FIELD_TYPES = ['text', 'number', 'currency', 'weight', 'volume', 'count', 'date', 'dropdown', 'boolean'] as const;

export function Categories() {
  const categories = useLiveQuery(() => db.categories.toArray());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for new/editing category
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [fields, setFields] = useState<FieldTemplate[]>([]);
  const [formulas, setFormulas] = useState<Partial<Formula>[]>([]);

  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelectCategory = async (cat: Category) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setFields(cat.fieldTemplate);
    if (cat.budget) {
      setBudgetEnabled(true);
      setBudgetAmount(cat.budget.amount.toString());
      setBudgetPeriod(cat.budget.period);
    } else {
      setBudgetEnabled(false);
      setBudgetAmount('');
      setBudgetPeriod('monthly');
    }
    const existingFormulas = await db.formulas.where('categoryId').equals(cat.id).toArray();
    setFormulas(existingFormulas);
    setIsEditing(true);
  };

  const handleNewCategory = () => {
    setSelectedCategory(null);
    setName('');
    setIcon('📦');
    setFields([]);
    setFormulas([]);
    setBudgetEnabled(false);
    setBudgetAmount('');
    setBudgetPeriod('monthly');
    setIsEditing(true);
  };

  const addField = () => {
    setFields([...fields, { name: '', type: 'text', required: false }]);
  };

  const updateField = (index: number, updates: Partial<FieldTemplate>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const addFormula = () => {
    setFormulas([...formulas, { name: '', expression: '' }]);
  };

  const updateFormula = (index: number, updates: Partial<Formula>) => {
    const newFormulas = [...formulas];
    newFormulas[index] = { ...newFormulas[index], ...updates };
    setFormulas(newFormulas);
  };

  const removeFormula = (index: number) => {
    setFormulas(formulas.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name) return alert('Category name is required');
    
    const now = Date.now();
    let catId = selectedCategory?.id;

    const budget = budgetEnabled && budgetAmount && !isNaN(parseFloat(budgetAmount)) 
      ? { amount: parseFloat(budgetAmount), period: budgetPeriod } 
      : undefined;

    // Clean up fields
    const cleanedFields = fields.map(f => {
      if (f.type === 'dropdown' && f.options) {
        return { ...f, options: f.options.map(o => o.trim()).filter(Boolean) };
      }
      return f;
    });

    if (selectedCategory) {
      await db.categories.update(selectedCategory.id, {
        name,
        icon,
        fieldTemplate: cleanedFields,
        budget,
        updatedAt: now
      });
    } else {
      catId = uuidv4();
      await db.categories.add({
        id: catId,
        name,
        icon,
        fieldTemplate: cleanedFields,
        budget,
        createdAt: now,
        updatedAt: now
      });
    }

    if (catId) {
      const existingIds = await db.formulas.where('categoryId').equals(catId).primaryKeys();
      await db.formulas.bulkDelete(existingIds as string[]);
      
      const newFormulas = formulas.filter(f => f.name && f.expression).map(f => ({
        id: f.id || uuidv4(),
        categoryId: catId!,
        name: f.name!,
        expression: f.expression!,
        createdAt: f.createdAt || now,
        updatedAt: now
      }));
      
      if (newFormulas.length > 0) {
        await db.formulas.bulkAdd(newFormulas);
      }
    }

    setIsEditing(false);
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    if (confirm(`Are you sure you want to delete the category "${selectedCategory.name}"?`)) {
      await db.categories.delete(selectedCategory.id);
      
      const existingIds = await db.formulas.where('categoryId').equals(selectedCategory.id).primaryKeys();
      await db.formulas.bulkDelete(existingIds as string[]);

      setIsEditing(false);
    }
  };

  return (
    <div>
      <h1 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Categories
        {!isEditing && (
          <button className="btn btn-primary" onClick={handleNewCategory} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> New Category
          </button>
        )}
      </h1>

      {!isEditing ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          {categories?.map(cat => (
            <div key={cat.id} className="card neu-flat" style={{ cursor: 'pointer' }} onClick={() => handleSelectCategory(cat)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{getCategoryIcon(cat.name, cat.icon)} {cat.name}</h3>
                <Edit2 size={16} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {cat.fieldTemplate.length} fields defined
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card neu-flat" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Category Name</label>
                <input className="input neu-pressed" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Electronics" />
              </div>
              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Icon</label>
                <input className="input neu-pressed" value={icon} onChange={e => setIcon(e.target.value)} placeholder="📦" />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Fields</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {fields.map((field, i) => (
                  <div key={i} className="card neu-flat" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input neu-pressed" style={{ flex: 1, minWidth: '150px' }} value={field.name} onChange={e => updateField(i, { name: e.target.value })} placeholder="Field Name" />
                    
                    <select className="input neu-pressed" style={{ flex: 1, minWidth: '120px' }} value={field.type} onChange={e => updateField(i, { type: e.target.value as any })}>
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={field.required} onChange={e => updateField(i, { required: e.target.checked })} />
                      Required
                    </label>

                    {field.type === 'dropdown' && (
                      <input 
                        className="input neu-pressed" 
                        style={{ flex: '1 1 100%' }}
                        value={field.options?.join(',') || ''} 
                        onChange={e => updateField(i, { options: e.target.value.split(',') })} 
                        placeholder="Options (comma separated)" 
                      />
                    )}

                    <button className="btn" style={{ padding: '0.5rem', color: 'var(--accent-danger)' }} onClick={() => removeField(i)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn" onClick={addField} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> Add Field
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Custom Formulas (e.g. Cost per Wear)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formulas.map((formula, i) => (
                  <div key={i} className="card neu-flat" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input neu-pressed" style={{ flex: '1 1 200px' }} value={formula.name} onChange={e => updateFormula(i, { name: e.target.value })} placeholder="Formula Name (e.g. Cost per Year)" />
                    <input className="input neu-pressed" style={{ flex: '2 1 300px' }} value={formula.expression} onChange={e => updateFormula(i, { expression: e.target.value })} placeholder="Expression (e.g. purchasePrice / lifespanYears)" />
                    
                    <button className="btn" style={{ padding: '0.5rem', color: 'var(--accent-danger)' }} onClick={() => removeFormula(i)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn" onClick={addFormula} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> Add Formula
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <input type="checkbox" checked={budgetEnabled} onChange={e => setBudgetEnabled(e.target.checked)} />
                Enable Spending Budget
              </label>
              {budgetEnabled && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Budget Amount</label>
                    <input type="number" min="0" step="0.01" className="input neu-pressed" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Period</label>
                    <select className="input neu-pressed" value={budgetPeriod} onChange={e => setBudgetPeriod(e.target.value as any)}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Save Category
              </button>
              {selectedCategory && (
                <button className="btn" onClick={handleDeleteCategory} style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trash2 size={18} /> Delete Category
                </button>
              )}
              <button className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
