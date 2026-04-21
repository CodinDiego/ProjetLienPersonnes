import React, { useState, useEffect, useRef } from 'react'
import useGraphStore from '../../store/useGraphStore'

const SHAPES = [
  { id: 'square', label: 'Carré', icon: '▪' },
  { id: 'circle', label: 'Cercle', icon: '●' },
  { id: 'diamond', label: 'Losange', icon: '◆' },
]

const COLORS = [
  { id: 'cyan',   hex: '#4ec9b0', label: 'Cyan'   },
  { id: 'blue',   hex: '#569cd6', label: 'Bleu'   },
  { id: 'orange', hex: '#ce9178', label: 'Orange' },
  { id: 'purple', hex: '#c586c0', label: 'Violet' },
  { id: 'green',  hex: '#6a9955', label: 'Vert'   },
  { id: 'yellow', hex: '#dcdcaa', label: 'Jaune'  },
]

export default function AddEntityModal({ onClose, editEntity, initialPos }) {
  const addEntity = useGraphStore(s => s.addEntity)
  const updateEntity = useGraphStore(s => s.updateEntity)

  const nameRef = useRef(editEntity?.name || '')
  const [nameDisplay, setNameDisplay] = useState(editEntity?.name || '')
  const [shape, setShape] = useState(editEntity?.shape || 'square')
  const [color, setColor] = useState(editEntity?.color || 'cyan')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = () => {
    const n = nameRef.current.trim()
    if (!n) return
    if (editEntity) {
      updateEntity(editEntity.id, { name: n, shape, color })
    } else {
      addEntity({ name: n, shape, color, x: initialPos?.x, y: initialPos?.y })
    }
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span className="title-icon">⬡</span>
          {editEntity ? "Modifier l'entité" : 'Nouvelle entité'}
        </div>

        <div className="form-row">
          <label className="form-label">Nom</label>
          <input
            ref={inputRef}
            className="form-input"
            placeholder="ex: Antoine ;)"
            defaultValue={editEntity?.name || ''}
            onChange={e => { nameRef.current = e.target.value; setNameDisplay(e.target.value) }}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose() }}
          />
        </div>

        <div className="form-row">
          <label className="form-label">Forme</label>
          <div className="shape-picker">
            {SHAPES.map(s => (
              <button
                key={s.id}
                type="button"
                className={`shape-option${shape === s.id ? ' selected' : ''}`}
                onClick={() => setShape(s.id)}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Couleur</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            {COLORS.map(c => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => setColor(c.id)}
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: c.hex,
                  border: color === c.id ? '3px solid #fff' : '3px solid transparent',
                  outline: color === c.id ? `2px solid ${c.hex}` : '2px solid transparent',
                  cursor: 'pointer',
                  transform: color === c.id ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.1s',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={!nameDisplay.trim()}
          >
            {editEntity ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}
