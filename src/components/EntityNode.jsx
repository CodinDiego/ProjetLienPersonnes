import React, { useRef, useState, useCallback } from 'react'
import useGraphStore from '../store/useGraphStore.js'

const COLORS = {
  cyan: '#4ec9b0',
  blue: '#569cd6',
  orange: '#ce9178',
  purple: '#c586c0',
  green: '#6a9955',
  yellow: '#dcdcaa',
}

const PADDING = { x: 24, y: 16 }
const MIN_SIZE = 48
const CHAR_W = 8  // approx px per char at 12px mono

function getEntitySize(name, shape) {
  const chars = (name || '').length
  let w = Math.max(MIN_SIZE, chars * CHAR_W + PADDING.x * 2)
  let h = Math.max(MIN_SIZE, 32 + PADDING.y)
  if (shape === 'circle') {
    const d = Math.max(MIN_SIZE, chars * CHAR_W + PADDING.x * 2)
    w = d; h = d
  }
  if (shape === 'diamond') {
    const base = Math.max(64, chars * CHAR_W + PADDING.x * 2)
    w = base; h = base
  }
  return { w, h }
}

export function getEntityBounds(entity) {
  const { w, h } = getEntitySize(entity.name, entity.shape)
  return { x: entity.x, y: entity.y, w, h }
}

export default function EntityNode({ entity, scale }) {
  const { selectedIds, selectEntity, moveEntity, startLinking, linkingFrom, mode, addLink } = useGraphStore()
  const isSelected = selectedIds.includes(entity.id)
  const isLinkingSource = linkingFrom === entity.id

  const dragRef = useRef(null)
  const nodeRef = useRef(null)

  const { w, h } = getEntitySize(entity.name, entity.shape)
  const color = COLORS[entity.color] || COLORS.cyan

  // ── Drag (mouse + touch) ──────────────────────
  const startDrag = useCallback((clientX, clientY) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: entity.x,
      origY: entity.y,
      moved: false,
    }
  }, [entity.x, entity.y])

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.stopPropagation()

    if (mode === 'linking') {
      // Complete the link
      if (linkingFrom && linkingFrom !== entity.id) {
        useGraphStore.getState().cancelLinking()
        // Show modal via custom event
        window.dispatchEvent(new CustomEvent('open-add-link', {
          detail: { from: linkingFrom, to: entity.id }
        }))
      }
      return
    }

    startDrag(e.clientX, e.clientY)

    const onMove = (me) => {
      if (!dragRef.current) return
      const dx = (me.clientX - dragRef.current.startX) / scale
      const dy = (me.clientY - dragRef.current.startY) / scale
      if (Math.abs(me.clientX - dragRef.current.startX) > 3 || Math.abs(me.clientY - dragRef.current.startY) > 3) {
        dragRef.current.moved = true
      }
      moveEntity(entity.id, dx, dy)
      dragRef.current.startX = me.clientX
      dragRef.current.startY = me.clientY
    }

    const onUp = () => {
      if (!dragRef.current?.moved) {
        selectEntity(entity.id, false)
      }
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [entity.id, mode, linkingFrom, scale, moveEntity, selectEntity, startDrag])

  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return
    e.stopPropagation()
    const t = e.touches[0]

    if (mode === 'linking') {
      if (linkingFrom && linkingFrom !== entity.id) {
        useGraphStore.getState().cancelLinking()
        window.dispatchEvent(new CustomEvent('open-add-link', {
          detail: { from: linkingFrom, to: entity.id }
        }))
      }
      return
    }

    startDrag(t.clientX, t.clientY)

    const onMove = (te) => {
      if (!dragRef.current || te.touches.length !== 1) return
      const touch = te.touches[0]
      const dx = (touch.clientX - dragRef.current.startX) / scale
      const dy = (touch.clientY - dragRef.current.startY) / scale
      if (Math.abs(touch.clientX - dragRef.current.startX) > 3 || Math.abs(touch.clientY - dragRef.current.startY) > 3) {
        dragRef.current.moved = true
      }
      moveEntity(entity.id, dx, dy)
      dragRef.current.startX = touch.clientX
      dragRef.current.startY = touch.clientY
      te.preventDefault()
    }

    const onEnd = () => {
      if (!dragRef.current?.moved) {
        selectEntity(entity.id, false)
      }
      dragRef.current = null
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }, [entity.id, mode, linkingFrom, scale, moveEntity, selectEntity, startDrag])

  const shapeClass = `entity-shape-${entity.shape || 'square'}`

  const style = {
    left: entity.x,
    top: entity.y,
    width: w,
    height: h,
    '--entity-stroke': color,
    cursor: mode === 'linking'
      ? (linkingFrom === entity.id ? 'not-allowed' : 'crosshair')
      : 'grab',
    zIndex: isSelected ? 10 : 5,
  }

  return (
    <div
      ref={nodeRef}
      className={`entity ${shapeClass}${isSelected ? ' selected' : ''}${isLinkingSource ? ' linking-source' : ''}`}
      style={style}
      data-color={entity.color}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <span className="entity-label">{entity.name}</span>
    </div>
  )
}
