import React, { useState, useEffect } from 'react';

export default function LibraryPickerModal({ isOpen, onClose, title, options, selected, onConfirm }) {
  const [localSelected, setLocalSelected] = useState(selected || []);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLocalSelected(selected || []);
    setSearch('');
  }, [isOpen, selected]);

  if (!isOpen) return null;

  const filtered = options.filter(o =>
    o.text.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    setLocalSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px',
        width: '100%', maxWidth: '560px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#1e3a5f', margin: 0 }}>{title}</p>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: '#94a3b8', lineHeight: 1
          }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              fontSize: 13, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Options list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 24px' }}>
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: '#94a3b8', padding: '16px 0' }}>No matching reasons found.</p>
          )}
          {filtered.map(option => (
            <label key={option.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid #f8fafc',
              cursor: 'pointer', fontSize: 13, color: '#334155', lineHeight: 1.5
            }}>
              <input
                type="checkbox"
                checked={localSelected.includes(option.id)}
                onChange={() => toggle(option.id)}
                style={{ marginTop: 2, accentColor: '#1e3a5f', flexShrink: 0 }}
              />
              {option.text}
            </label>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            {localSelected.length} selected
          </p>
          <button
            onClick={() => { onConfirm(localSelected); onClose(); }}
            style={{
              background: '#1e3a5f', color: '#fff',
              border: 'none', borderRadius: '8px',
              padding: '10px 24px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.5px'
            }}
          >
            CONFIRM SELECTION
          </button>
        </div>
      </div>
    </div>
  );
}