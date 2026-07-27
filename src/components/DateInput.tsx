import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function DateInput({ value, onChange, className, style }: DateInputProps) {
  const [textVal, setTextVal] = useState(value);

  useEffect(() => {
    setTextVal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextVal(e.target.value);
  };

  const handleBlur = () => {
    let formatted = textVal.trim();
    if (formatted && !/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      // Try to parse if they typed MM/DD/YYYY or similar
      const parts = formatted.split(/[-/.]/);
      if (parts.length === 3) {
        // Assume MM/DD/YYYY if first part is <= 12 and last part is >= 2000
        let y = parts[2], m = parts[0], d = parts[1];
        
        if (parts[0].length === 4) {
           // It's YYYY/MM/DD
           y = parts[0]; m = parts[1]; d = parts[2];
        } else {
           if (y.length === 2) y = '20' + y;
        }
        
        if (m.length === 1) m = '0' + m;
        if (d.length === 1) d = '0' + d;
        
        if (y.length === 4) {
          formatted = `${y}-${m}-${d}`;
        }
      }
    }
    setTextVal(formatted);
    onChange(formatted);
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <input 
        type="text"
        className={className}
        value={textVal}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="YYYY-MM-DD"
        style={{ width: '100%', paddingRight: '2.5rem' }}
      />
      <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
        <Calendar size={18} />
      </div>
      <input 
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', right: 0, top: 0, width: '3rem', height: '100%', opacity: 0, cursor: 'pointer' }}
        title="Open calendar picker"
      />
    </div>
  );
}
