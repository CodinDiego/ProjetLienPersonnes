import React, { useState, useEffect, useCallback } from 'react'
import useGraphStore from './store/useGraphStore'
import Toolbar from './components/Toolbar'
import Canvas from './components/Canvas'
import ContextMenu from './components/ContextMenu'
import AddEntityModal from './components/Modals/AddEntityModal'
import AddLinkModal from './components/Modals/AddLinkModal'
import AddGroupModal from './components/Modals/AddGroupModal'
import MobileNav from './components/MobileNav'

export default function App() {
  const { initTheme } = useGraphStore()

  const [modal, setModal] = useState(null)
  // modal: { type: 'entity'|'link'|'group', data?: ... }

  const [contextMenu, setContextMenu] = useState(null)
  // contextMenu: { x, y, target }

  useEffect(() => {
    initTheme()
  }, [initTheme])

  // Listen for linking completion event from EntityNode
  useEffect(() => {
    const handler = (e) => {
      const { from, to } = e.detail
      setModal({ type: 'link', data: { preFrom: from, preTo: to } })
    }
    window.addEventListener('open-add-link', handler)
    return () => window.removeEventListener('open-add-link', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setModal(null)
        setContextMenu(null)
        useGraphStore.getState().cancelLinking()
        useGraphStore.getState().clearSelection()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        const { selectedIds, selectedLinkId, selectedGroupId, deleteEntity, deleteLink, deleteGroup } = useGraphStore.getState()
        selectedIds.forEach(id => deleteEntity(id))
        if (selectedLinkId) deleteLink(selectedLinkId)
        if (selectedGroupId) deleteGroup(selectedGroupId)
      }
      // n = new entity
      if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setModal({ type: 'entity' })
      }
      // l = new link
      if (e.key === 'l' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setModal({ type: 'link' })
      }
      // g = new group
      if (e.key === 'g' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setModal({ type: 'group' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const openContextMenu = useCallback((x, y, target) => {
    setContextMenu({ x, y, target })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const handleContextEdit = useCallback((target) => {
    if (!target) return
    if (target.type === 'entity') {
      const entity = useGraphStore.getState().entities.find(e => e.id === target.id)
      setModal({ type: 'entity', data: entity })
    } else if (target.type === 'group') {
      const group = useGraphStore.getState().groups.find(g => g.id === target.id)
      setModal({ type: 'group', data: group })
    } else if (target.type === 'new-entity') {
      // Pass coordinates to place entity at right-click position
      setModal({ type: 'entity', data: null, pos: target })
    }
  }, [])

  return (
    <div className="app">
      <Toolbar
        onAddEntity={(entity) => setModal({ type: 'entity', data: entity || null })}
        onAddLink={(link) => setModal({ type: 'link', data: link || null })}
        onAddGroup={(group) => setModal({ type: 'group', data: group || null })}
      />

      <Canvas onContextMenu={openContextMenu} />

      <MobileNav
        onAddEntity={(entity) => setModal({ type: 'entity', data: entity || null })}
        onAddLink={(link) => setModal({ type: 'link', data: link || null })}
        onAddGroup={(group) => setModal({ type: 'group', data: group || null })}
      />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={closeContextMenu}
          onEdit={handleContextEdit}
        />
      )}

      {/* Modals */}
      {modal?.type === 'entity' && (
        <AddEntityModal
          editEntity={modal.data || null}
          initialPos={modal.pos || null}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'link' && (
        <AddLinkModal
          preFrom={modal.data?.preFrom || modal.data?.from || ''}
          preTo={modal.data?.preTo || modal.data?.to || ''}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'group' && (
        <AddGroupModal
          editGroup={modal.data || null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
