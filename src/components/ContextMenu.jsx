import React, { useEffect, useRef } from 'react'
import useGraphStore from '../store/useGraphStore.js'

export default function ContextMenu({ x, y, target, onClose, onEdit }) {
  const { deleteEntity, deleteLink, deleteGroup, startLinking } = useGraphStore()
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('touchstart', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('touchstart', close)
    }
  }, [onClose])

  const items = []

  if (target?.type === 'entity') {
    items.push(
      { icon: '', label: 'Modifier', action: () => { onEdit(target); onClose() } },
      { icon: '⟶', label: 'Créer un lien depuis...', action: () => { startLinking(target.id); onClose() } },
      { separator: true },
      { icon: '🗑', label: 'Supprimer l\'entité', danger: true, action: () => { deleteEntity(target.id); onClose() } },
    )
  } else if (target?.type === 'link') {
    items.push(
      { icon: '🗑', label: 'Supprimer le lien', danger: true, action: () => { deleteLink(target.id); onClose() } },
    )
  } else if (target?.type === 'group') {
    items.push(
      { icon: '', label: 'Modifier le groupe', action: () => { onEdit(target); onClose() } },
      { separator: true },
      { icon: '🗑', label: 'Supprimer le groupe', danger: true, action: () => { deleteGroup(target.id); onClose() } },
    )
  } else {
    items.push(
      { icon: '⬡', label: 'Nouvelle entité ici', action: () => { onEdit({ type: 'new-entity', x, y }); onClose() } },
    )
  }

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <div
            key={i}
            className={`context-menu-item${item.danger ? ' danger' : ''}`}
            onClick={item.action}
          >
            <span className="cm-icon">{item.icon}</span>
            {item.label}
          </div>
        )
      )}
    </div>
  )
}
