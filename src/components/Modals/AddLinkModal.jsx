import React, { useState, useEffect, useRef } from 'react'
import useGraphStore from '../../store/useGraphStore'

const LINK_TYPES = [
  { id: 'none', label: 'Lien simple', icon: '─' },
  { id: 'arrow', label: 'Flèche →', icon: '→' },
  { id: 'bidirectional', label: 'Bidirectionnel', icon: '↔' },
]

export default function AddLinkModal({ onClose, preFrom, preTo }) {
  const { entities, addLink } = useGraphStore()
  const [from, setFrom] = useState(preFrom || '')
  const [to, setTo] = useState(preTo || '')
  const [type, setType] = useState('arrow')
  const [label, setLabel] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!from || !to || from === to) return
    addLink({ from, to, type, label: label.trim() })
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
          <span className="title-icon">⟶</span>
          Nouveau lien
        </div>

        <div className="form-row">
          <label className="form-label">De</label>
          <select
            className="form-input"
            value={from}
            onChange={e => setFrom(e.target.value)}
          >
            <option value="">— Choisir une entité —</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label className="form-label">Vers</label>
          <select
            className="form-input"
            value={to}
            onChange={e => setTo(e.target.value)}
          >
            <option value="">— Choisir une entité —</option>
            {entities.filter(e => e.id !== from).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label className="form-label">Type de lien</label>
          <div className="link-type-picker">
            {LINK_TYPES.map(t => (
              <button
                key={t.id}
                className={`link-type-option${type === t.id ? ' selected' : ''}`}
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setType(t.id) }}
                type="button"
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ fontSize: 10 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Label (optionnel)</label>
          <input
            ref={inputRef}
            className="form-input"
            placeholder="ex: ami, travaille avec..."
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onMouseDown={e => { e.stopPropagation(); onClose() }}>Annuler</button>
          <button
            type="button"
            className="btn-primary"
            onMouseDown={(e) => { e.stopPropagation(); if (!from || !to || from === to) return; addLink({ from, to, type, label: label.trim() }); onClose() }}
            disabled={!from || !to || from === to}
          >
            Créer le lien
          </button>
        </div>
      </div>
    </div>
  )
}
