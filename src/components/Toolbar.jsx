import React, { useRef } from 'react'
import useGraphStore from '../store/useGraphStore'

export default function Toolbar({ onAddEntity, onAddLink, onAddGroup }) {
  const {
    theme, toggleTheme,
    toolbarCollapsed, toggleToolbar,
    selectedIds, selectedLinkId, selectedGroupId,
    entities, links, groups,
    deleteEntity, deleteLink, deleteGroup,
    clearAll, exportJSON, importJSON,
    mode, cancelLinking,
  } = useGraphStore()

  const fileRef = useRef(null)

  const hasEntitySel = selectedIds.length > 0
  const hasLinkSel = !!selectedLinkId
  const hasGroupSel = !!selectedGroupId

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        importJSON(data)
      } catch {}
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const col = toolbarCollapsed

  return (
    <aside className={`toolbar${col ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className="toolbar-header">
        {!col && (
          <div className="toolbar-logo">
            <span className="logo-dot" />
            <span className="logo-text">GraphApp</span>
          </div>
        )}
        <button className="toolbar-collapse-btn" onClick={toggleToolbar} title={col ? 'Ouvrir' : 'Réduire'}>
          {col ? '›' : '‹'}
        </button>
      </div>

      {/* Add */}
      <div className="toolbar-section">
        {!col && <div className="toolbar-section-label">Ajouter</div>}
        <button className="toolbar-btn" onClick={() => onAddEntity(null)} title="Nouvelle entité">
          <span className="btn-icon">⬡</span>
          {!col && <span className="btn-label">Nouvelle entité</span>}
        </button>
        <button className="toolbar-btn" onClick={() => onAddLink(null)} title="Nouveau lien">
          <span className="btn-icon">⟶</span>
          {!col && <span className="btn-label">Nouveau lien</span>}
        </button>
        <button className="toolbar-btn" onClick={() => onAddGroup(null)} title="Nouveau groupe">
          <span className="btn-icon">⬜</span>
          {!col && <span className="btn-label">Nouveau groupe</span>}
        </button>
      </div>

      {/* Mode */}
      {mode === 'linking' && (
        <div className="toolbar-section">
          {!col && <div className="toolbar-section-label">Mode actif</div>}
          <button className="toolbar-btn active" onClick={cancelLinking} title="Annuler le mode lien">
            <span className="btn-icon">✕</span>
            {!col && <span className="btn-label">Annuler lien</span>}
          </button>
        </div>
      )}

      {/* Selected actions */}
      {(hasEntitySel || hasLinkSel || hasGroupSel) && (
        <div className="toolbar-section">
          {!col && <div className="toolbar-section-label">Sélection</div>}
          {hasEntitySel && (
            <>
              <button className="toolbar-btn" onClick={() => {
                const entity = entities.find(e => e.id === selectedIds[0])
                if (entity) onAddEntity(entity)
              }} title="Modifier l'entité">
                <span className="btn-icon">✏️</span>
                {!col && <span className="btn-label">Modifier entité</span>}
              </button>
              <button
                className="toolbar-btn danger"
                onClick={() => selectedIds.forEach(id => deleteEntity(id))}
                title="Supprimer"
              >
                <span className="btn-icon">🗑</span>
                {!col && <span className="btn-label">Supprimer entité</span>}
              </button>
            </>
          )}
          {hasLinkSel && (
            <button className="toolbar-btn danger" onClick={() => deleteLink(selectedLinkId)} title="Supprimer le lien">
              <span className="btn-icon">🗑</span>
              {!col && <span className="btn-label">Supprimer lien</span>}
            </button>
          )}
          {hasGroupSel && (
            <>
              <button className="toolbar-btn" onClick={() => {
                const group = groups.find(g => g.id === selectedGroupId)
                if (group) onAddGroup(group)
              }} title="Modifier le groupe">
                <span className="btn-icon"></span>
                {!col && <span className="btn-label">Modifier groupe</span>}
              </button>
              <button className="toolbar-btn danger" onClick={() => deleteGroup(selectedGroupId)} title="Supprimer le groupe">
                <span className="btn-icon">🗑</span>
                {!col && <span className="btn-label">Supprimer groupe</span>}
              </button>
            </>
          )}
        </div>
      )}

      {/* Data */}
      <div className="toolbar-section">
        {!col && <div className="toolbar-section-label">Données</div>}
        <button className="toolbar-btn" onClick={exportJSON} title="Exporter JSON">
          <span className="btn-icon">↓</span>
          {!col && <span className="btn-label">Exporter JSON</span>}
        </button>
        <button className="toolbar-btn" onClick={() => fileRef.current?.click()} title="Importer JSON">
          <span className="btn-icon">↑</span>
          {!col && <span className="btn-label">Importer JSON</span>}
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <button className="toolbar-btn danger" onClick={() => { if (confirm('Effacer tout ?')) clearAll() }} title="Effacer tout">
          <span className="btn-icon">⊘</span>
          {!col && <span className="btn-label">Effacer tout</span>}
        </button>
      </div>

      {/* Footer */}
      <div className="toolbar-footer">
        <button className="theme-btn" onClick={toggleTheme} title="Changer le thème">
          <span className="btn-icon" style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {!col && <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>
      </div>
    </aside>
  )
}
