import React, { useRef, useState, useEffect, useCallback } from 'react'
import useGraphStore from '../store/useGraphStore.js'
import EntityNode from './EntityNode.jsx'
import LinkLine from './LinkLine.jsx'
import GroupRect from './GroupRect.jsx'

const MIN_ZOOM = 0.08
const MAX_ZOOM = 4
const GRID_SIZE = 32

function GridDots({ scale, offsetX, offsetY }) {
  const spacing = GRID_SIZE * scale
  if (spacing < 10) return null
  const dotSize = Math.max(0.8, 1.2 * Math.min(scale, 1))
  const bgX = ((offsetX % spacing) + spacing) % spacing
  const bgY = ((offsetY % spacing) + spacing) % spacing
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.45 }}>
      <defs>
        <pattern id="grid-dots" x={bgX} y={bgY} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <circle cx={0} cy={0} r={dotSize} fill="var(--text-muted)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-dots)" />
    </svg>
  )
}

export default function Canvas({ onContextMenu }) {
  const { entities, links, groups, mode, linkingFrom, cancelLinking, clearSelection } = useGraphStore()

  const wrapperRef = useRef(null)
  const [offset, setOffset] = useState({ x: 60, y: 60 })
  const [scale, setScale] = useState(1)

  const panRef = useRef(null)
  const pinchRef = useRef(null)

  // ── Zoom helper (pivot in screen coords) ────────
  const applyZoom = useCallback((factor, pivotX, pivotY) => {
    setScale(prev => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor))
      const r = next / prev
      setOffset(o => ({
        x: pivotX - (pivotX - o.x) * r,
        y: pivotY - (pivotY - o.y) * r,
      }))
      return next
    })
  }, [])

  // ── Wheel zoom ───────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      applyZoom(Math.exp(-e.deltaY * 0.002), e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [applyZoom])

  // ── Mouse pan (global move/up) ───────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!panRef.current) return
      const dx = e.clientX - panRef.current.lastX
      const dy = e.clientY - panRef.current.lastY
      if (Math.abs(dx) + Math.abs(dy) > 2) panRef.current.moved = true
      panRef.current.lastX = e.clientX
      panRef.current.lastY = e.clientY
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
    }
    const onUp = () => { panRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const isCanvasBg = (target) =>
    target === wrapperRef.current
    || target.classList?.contains('canvas-inner')
    || target.tagName === 'svg'
    || (target.tagName === 'rect' && target.closest('svg')?.style?.pointerEvents !== 'none' === false)
    || target.getAttribute?.('fill') === 'url(#grid-dots)'

  const onMouseDown = useCallback((e) => {
    if (e.button === 1) {
      e.preventDefault()
      panRef.current = { lastX: e.clientX, lastY: e.clientY, moved: false }
      return
    }
    if (e.button !== 0) return
    if (isCanvasBg(e.target)) {
      if (mode === 'linking') { cancelLinking(); return }
      clearSelection()
      panRef.current = { lastX: e.clientX, lastY: e.clientY, moved: false }
    }
  }, [mode, cancelLinking, clearSelection])

  // ── Touch ────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const [t1, t2] = e.touches
      pinchRef.current = {
        dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
      }
      panRef.current = null
      return
    }
    if (e.touches.length === 1 && isCanvasBg(e.target)) {
      panRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY, moved: false }
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const [t1, t2] = e.touches
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const midX = (t1.clientX + t2.clientX) / 2
      const midY = (t1.clientY + t2.clientY) / 2
      const rect = wrapperRef.current.getBoundingClientRect()
      applyZoom(dist / pinchRef.current.dist, midX - rect.left, midY - rect.top)
      setOffset(o => ({ x: o.x + midX - pinchRef.current.midX, y: o.y + midY - pinchRef.current.midY }))
      pinchRef.current = { dist, midX, midY }
      return
    }
    if (e.touches.length === 1 && panRef.current) {
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - panRef.current.lastX
      const dy = t.clientY - panRef.current.lastY
      if (Math.abs(dx) + Math.abs(dy) > 2) panRef.current.moved = true
      panRef.current.lastX = t.clientX
      panRef.current.lastY = t.clientY
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
    }
  }, [applyZoom])

  const onTouchEnd = useCallback(() => { pinchRef.current = null; panRef.current = null }, [])

  const onCtxMenu = useCallback((e) => {
    e.preventDefault()
    onContextMenu(e.clientX, e.clientY, null)
  }, [onContextMenu])

  const centerZoom = (factor) => {
    const el = wrapperRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    applyZoom(factor, r.width / 2, r.height / 2)
  }

  return (
    <div
      ref={wrapperRef}
      className={`canvas-wrapper${panRef.current ? ' panning' : ''}${mode === 'linking' ? ' linking' : ''}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={onCtxMenu}
    >
      <GridDots scale={scale} offsetX={offset.x} offsetY={offset.y} />

      {mode === 'linking' && linkingFrom && (
        <div className="linking-hint">Cliquez sur l'entité cible · Échap pour annuler</div>
      )}

      <div
        className="canvas-inner"
        style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
      >
        {groups.map(g => <GroupRect key={g.id} group={g} entities={entities} />)}

        <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', width: 0, height: 0, pointerEvents: 'none' }}>
          {links.map(link => <LinkLine key={link.id} link={link} entities={entities} />)}
        </svg>

        {entities.map(entity => <EntityNode key={entity.id} entity={entity} scale={scale} />)}
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => centerZoom(1.25)} title="Zoom +">+</button>
        <button className="zoom-btn" onClick={() => { setScale(1); setOffset({ x: 60, y: 60 }) }} title="Reset" style={{ fontSize: 10 }}>1:1</button>
        <button className="zoom-btn" onClick={() => centerZoom(1 / 1.25)} title="Zoom −">−</button>
      </div>

      <div className="status-bar">
        <span>{Math.round(scale * 100)}%</span>
        <span className="sep">·</span>
        <span>{entities.length} entité{entities.length !== 1 ? 's' : ''}</span>
        <span className="sep">·</span>
        <span>{links.length} lien{links.length !== 1 ? 's' : ''}</span>
        <span className="sep">·</span>
        <span>{groups.length} groupe{groups.length !== 1 ? 's' : ''}</span>
        <span className="sep">·</span>
        <span style={{ color: 'var(--accent-green)', fontSize: 9 }}>● saved</span>
      </div>
    </div>
  )
}
