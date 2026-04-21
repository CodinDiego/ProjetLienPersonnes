import React, { useState } from 'react'
import useGraphStore from '../store/useGraphStore'

export default function MobileNav({ onAddEntity, onAddLink, onAddGroup }) {
  const {
    theme, toggleTheme,
    selectedIds, selectedLinkId, selectedGroupId,
    entities, groups,
    deleteEntity, deleteLink, deleteGroup,
    mode, cancelLinking,
  } = useGraphStore()

  const [menuOpen, setMenuOpen] = useState(false)

  const hasEntitySel = selectedIds.length > 0
  const hasLinkSel = !!selectedLinkId
  const hasGroupSel = !!selectedGroupId
  const hasSel = hasEntitySel || hasLinkSel || hasGroupSel

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      {/* Overlay behind expanded menu */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 190 }}
          onClick={closeMenu}
        />
      )}

      {/* Expanded action menu */}
      {menuOpen && (
        <div className="mobile-action-menu">
          <div className="mobile-action-section-label">Ajouter</div>
          <div className="mobile-action-row">
            <button className="mobile-action-btn" onClick={() => { onAddEntity(null); closeMenu() }}>
              <span>⬡</span><span>Entité</span>
            </button>
            <button className="mobile-action-btn" onClick={() => { onAddLink(null); closeMenu() }}>
              <span>⟶</span><span>Lien</span>
            </button>
            <button className="mobile-action-btn" onClick={() => { onAddGroup(null); closeMenu() }}>
              <span>⬜</span><span>Groupe</span>
            </button>
          </div>

          {hasSel && (
            <>
              <div className="mobile-action-section-label" style={{ marginTop: 12 }}>Sélection</div>
              <div className="mobile-action-row">
                {hasEntitySel && (
                  <>
                    <button className="mobile-action-btn" onClick={() => {
                      const entity = entities.find(e => e.id === selectedIds[0])
                      if (entity) { onAddEntity(entity); closeMenu() }
                    }}>
                      <span>✏️</span><span>Modifier</span>
                    </button>
                    <button className="mobile-action-btn danger" onClick={() => {
                      selectedIds.forEach(id => deleteEntity(id)); closeMenu()
                    }}>
                      <span>🗑</span><span>Supprimer</span>
                    </button>
                  </>
                )}
                {hasLinkSel && (
                  <button className="mobile-action-btn danger" onClick={() => { deleteLink(selectedLinkId); closeMenu() }}>
                    <span>🗑</span><span>Suppr. lien</span>
                  </button>
                )}
                {hasGroupSel && (
                  <>
                    <button className="mobile-action-btn" onClick={() => {
                      const group = groups.find(g => g.id === selectedGroupId)
                      if (group) { onAddGroup(group); closeMenu() }
                    }}>
                      <span>✏️</span><span>Modifier</span>
                    </button>
                    <button className="mobile-action-btn danger" onClick={() => { deleteGroup(selectedGroupId); closeMenu() }}>
                      <span>🗑</span><span>Suppr. groupe</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {mode === 'linking' && (
            <>
              <div className="mobile-action-section-label" style={{ marginTop: 12 }}>Mode actif</div>
              <div className="mobile-action-row">
                <button className="mobile-action-btn active" onClick={() => { cancelLinking(); closeMenu() }}>
                  <span>✕</span><span>Annuler lien</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Fixed bottom bar */}
      <nav className="mobile-nav">
        <button
          className={`mobile-nav-btn${menuOpen ? ' active' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
        >
          <span style={{ fontSize: 20 }}>{menuOpen ? '✕' : '＋'}</span>
          <span>Actions</span>
        </button>

        <button className="mobile-nav-btn" onClick={() => { onAddEntity(null) }}>
          <span style={{ fontSize: 18 }}>⬡</span>
          <span>Entité</span>
        </button>

        <button className="mobile-nav-btn" onClick={() => { onAddLink(null) }}>
          <span style={{ fontSize: 18 }}>⟶</span>
          <span>Lien</span>
        </button>

        <button className="mobile-nav-btn" onClick={() => { onAddGroup(null) }}>
          <span style={{ fontSize: 18 }}>⬜</span>
          <span>Groupe</span>
        </button>

        <button className="mobile-nav-btn" onClick={toggleTheme}>
          <span style={{ fontSize: 18 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>Thème</span>
        </button>
      </nav>
    </>
  )
}
