import React, { useState, useEffect, useRef } from 'react'
import useGraphStore from '../../store/useGraphStore'

const COLORS = [
  { id: 'blue',   hex: '#569cd6' },
  { id: 'cyan',   hex: '#4ec9b0' },
  { id: 'purple', hex: '#c586c0' },
  { id: 'orange', hex: '#ce9178' },
  { id: 'green',  hex: '#6a9955' },
  { id: 'yellow', hex: '#dcdcaa' },
  { id: 'red',    hex: '#f44747' },
  { id: 'pink',   hex: '#f48fb1' },
  { id: 'indigo', hex: '#7986cb' },
  { id: 'teal',   hex: '#26a69a' },
  { id: 'lime',   hex: '#aed581' },
  { id: 'amber',  hex: '#ffca28' },
  { id: 'coral',  hex: '#ff7043' },
  { id: 'sky',    hex: '#29b6f6' },
  { id: 'white',  hex: '#e0e0e0' },
  { id: 'gold',   hex: '#ffd700' },
]

export default function AddGroupModal({ onClose, editGroup }) {
  const { entities, addGroup, updateGroup } = useGraphStore()
  const [name, setName] = useState(editGroup?.name || '')
  const [color, setColor] = useState(editGroup?.color || 'blue')
  const [selected, setSelected] = useState(new Set(editGroup?.entityIds || []))
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const entityIds = [...selected]
    if (editGroup) {
      updateGroup(editGroup.id, { name: name.trim(), color, entityIds })
    } else {
      addGroup({ name: name.trim(), color, entityIds })
    }
    onClose()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-title">
          <span className="title-icon">⬜</span>
          {editGroup ? 'Modifier le groupe' : 'Nouveau groupe'}
        </div>

        <div className="form-row">
          <label className="form-label">Nom du groupe</label>
          <input
            ref={inputRef}
            className="form-input"
            placeholder="ex: Amis collège"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>

        <div className="form-row">
          <label className="form-label">Couleur</label>
          <div className="color-picker">
            {COLORS.map(c => (
              <button
                key={c.id}
                className={`color-option${color === c.id ? ' selected' : ''}`}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setColor(c.id) }}
                type="button"
              >
                <span className="color-swatch" style={{ background: c.hex }} />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Entités membres ({selected.size})</label>
          <div className="entity-checklist">
            {entities.length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                Aucune entité disponible
              </div>
            ) : (
              entities.map(e => (
                <label key={e.id} className="entity-check-item">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                  {e.name}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{e.shape}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onMouseDown={e => { e.stopPropagation(); onClose() }}>Annuler</button>
          <button type="button" className="btn-primary" onMouseDown={(e) => { e.stopPropagation(); handleSubmit() }} disabled={!name.trim()}>
            {editGroup ? 'Enregistrer' : 'Créer le groupe'}
          </button>
        </div>
      </div>
    </div>
  )
}
