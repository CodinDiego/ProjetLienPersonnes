import React, { useState, useRef } from 'react'
import useGraphStore from '../store/useGraphStore'

export default function MobileNav({ onAddEntity, onAddLink, onAddGroup }) {
  const {
    theme, toggleTheme,
    selectedIds, selectedLinkId, selectedGroupId,
    entities, groups,
    deleteEntity, deleteLink, deleteGroup,
    clearAll, exportJSON, importJSON,
    mode, cancelLinking,
  } = useGraphStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef(null)

  const hasEntitySel = selectedIds.length > 0
  const hasLinkSel = !!selectedLinkId
  const hasGroupSel = !!selectedGroupId
  const hasSel = hasEntitySel || hasLinkSel || hasGroupSel

  const close = () => setMenuOpen(false)

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try { importJSON(JSON.parse(ev.target.result)) } catch {}
    }
    reader.readAsText(file)
    e.target.value = ''
    close()
  }

  return (
    <>
      {menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:190 }} onClick={close} />
      )}

      {menuOpen && (
        <div className="mobile-action-menu">

          {/* Sélection contextuelle */}
          {hasSel && (
            <>
              <div className="mobile-action-section-label">Sélection</div>
              <div className="mobile-action-row" style={{ marginBottom: 14 }}>
                {hasEntitySel && <>
                  <button className="mobile-action-btn" onClick={() => {
                    const e = entities.find(e => e.id === selectedIds[0])
                    if (e) { onAddEntity(e); close() }
                  }}>✏️ Modifier</button>
                  <button className="mobile-action-btn danger" onClick={() => {
                    selectedIds.forEach(id => deleteEntity(id)); close()
                  }}>🗑 Suppr. entité</button>
                </>}
                {hasLinkSel && (
                  <button className="mobile-action-btn danger" onClick={() => { deleteLink(selectedLinkId); close() }}>
                    🗑 Suppr. lien
                  </button>
                )}
                {hasGroupSel && <>
                  <button className="mobile-action-btn" onClick={() => {
                    const g = groups.find(g => g.id === selectedGroupId)
                    if (g) { onAddGroup(g); close() }
                  }}>✏️ Modifier groupe</button>
                  <button className="mobile-action-btn danger" onClick={() => { deleteGroup(selectedGroupId); close() }}>
                    🗑 Suppr. groupe
                  </button>
                </>}
              </div>
            </>
          )}

          {mode === 'linking' && (
            <>
              <div className="mobile-action-section-label">Mode actif</div>
              <div className="mobile-action-row" style={{ marginBottom: 14 }}>
                <button className="mobile-action-btn active" onClick={() => { cancelLinking(); close() }}>
                  ✕ Annuler lien
                </button>
              </div>
            </>
          )}

          <div className="mobile-action-section-label">Données</div>
          <div className="mobile-action-row">
            <button className="mobile-action-btn" onClick={() => { exportJSON(); close() }}>↓ Exporter</button>
            <button className="mobile-action-btn" onClick={() => fileRef.current?.click()}>↑ Importer</button>
            <button className="mobile-action-btn danger" onClick={() => {
              if (confirm('Effacer tout ?')) { clearAll(); close() }
            }}>⊘ Tout suppr.</button>
            <button className="mobile-action-btn" onClick={() => { toggleTheme(); close() }}>
              {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
            </button>
          </div>

          <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
        </div>
      )}

      <nav className="mobile-nav">
        <button className="mobile-nav-btn" onClick={() => { close(); onAddEntity(null) }}>
          <span>⬡</span><span>Entité</span>
        </button>
        <button className="mobile-nav-btn" onClick={() => { close(); onAddLink(null) }}>
          <span>⟶</span><span>Lien</span>
        </button>
        <button className="mobile-nav-btn" onClick={() => { close(); onAddGroup(null) }}>
          <span>⬜</span><span>Groupe</span>
        </button>
        <button className={`mobile-nav-btn${menuOpen ? ' active' : ''}`} onClick={() => setMenuOpen(v => !v)}>
          <span>{menuOpen ? '✕' : '⋯'}</span><span>Actions</span>
        </button>
      </nav>
    </>
  )
}
