import React, { useRef, useState, useEffect, useCallback } from 'react'
import useGraphStore from '../store/useGraphStore'
import EntityNode from './EntityNode'
import LinkLine from './LinkLine'
import GroupRect from './GroupRect'

const MIN_ZOOM = 0.2
const MAX_ZOOM = 3
const GRID_SIZE = 32

function GridDots({ scale, offsetX, offsetY }) {
  const spacing = GRID_SIZE * scale
  if (spacing < 10) return null
  const dotSize = Math.max(0.8, 1.2 * Math.min(scale, 1))
  const bgX = ((offsetX % spacing) + spacing) % spacing
  const bgY = ((offsetY % spacing) + spacing) % spacing
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.4 }}>
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
  // Use refs for offset/scale during touch to avoid stale closures
  const offsetRef = useRef({ x: 60, y: 60 })
  const scaleRef  = useRef(1)
  const [renderKey, setRenderKey] = useState({ offset: { x: 60, y: 60 }, scale: 1 })

  const commit = () => {
    setRenderKey({ offset: { ...offsetRef.current }, scale: scaleRef.current })
  }

  const panRef   = useRef(null)
  const pinchRef = useRef(null)

  const clampScale = (s) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s))

  const applyZoomRef = (factor, pivotX, pivotY) => {
    const prev = scaleRef.current
    const next = clampScale(prev * factor)
    const r = next / prev
    offsetRef.current = {
      x: pivotX - (pivotX - offsetRef.current.x) * r,
      y: pivotY - (pivotY - offsetRef.current.y) * r,
    }
    scaleRef.current = next
  }

  // ── Wheel (desktop) ──────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      applyZoomRef(Math.exp(-e.deltaY * 0.002), e.clientX - rect.left, e.clientY - rect.top)
      commit()
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Touch events — all non-passive ──────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const isBackground = (t) =>
      t === el
      || t.classList?.contains('canvas-inner')
      || t.getAttribute?.('fill') === 'url(#grid-dots)'
      || t.tagName === 'pattern'

    const onStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        panRef.current = null
        const [t1, t2] = e.touches
        pinchRef.current = {
          dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
          midX: (t1.clientX + t2.clientX) / 2,
          midY: (t1.clientY + t2.clientY) / 2,
        }
        return
      }
      if (e.touches.length === 1) {
        pinchRef.current = null
        if (isBackground(e.target)) {
          panRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }
      }
    }

    const onMove = (e) => {
      // Pinch zoom
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const [t1, t2] = e.touches
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const midX = (t1.clientX + t2.clientX) / 2
        const midY = (t1.clientY + t2.clientY) / 2
        const rect = el.getBoundingClientRect()

        if (pinchRef.current.dist > 0) {
          const factor = dist / pinchRef.current.dist
          // Only apply if factor is sane (avoid NaN / infinity)
          if (isFinite(factor) && factor > 0.5 && factor < 2) {
            applyZoomRef(factor, midX - rect.left, midY - rect.top)
          }
          // Pan from pinch midpoint movement
          offsetRef.current.x += midX - pinchRef.current.midX
          offsetRef.current.y += midY - pinchRef.current.midY
        }

        pinchRef.current = { dist, midX, midY }
        commit()
        return
      }

      // 1-finger pan
      if (e.touches.length === 1 && panRef.current) {
        e.preventDefault()
        const t = e.touches[0]
        offsetRef.current.x += t.clientX - panRef.current.x
        offsetRef.current.y += t.clientY - panRef.current.y
        panRef.current = { x: t.clientX, y: t.clientY }
        commit()
      }
    }

    const onEnd = () => {
      if (e => e.touches?.length === 0) {
        pinchRef.current = null
        panRef.current   = null
      }
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true  })
    el.addEventListener('touchcancel',onEnd,   { passive: true  })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
      el.removeEventListener('touchcancel',onEnd)
    }
  }, [])

  // ── Mouse pan ────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!panRef.current) return
      offsetRef.current.x += e.clientX - panRef.current.x
      offsetRef.current.y += e.clientY - panRef.current.y
      panRef.current = { x: e.clientX, y: e.clientY }
      commit()
    }
    const onUp = () => { panRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const onMouseDown = useCallback((e) => {
    if (e.button === 1) { e.preventDefault(); panRef.current = { x: e.clientX, y: e.clientY }; return }
    if (e.button !== 0) return
    const bg = e.target === wrapperRef.current
      || e.target.classList?.contains('canvas-inner')
      || e.target.getAttribute?.('fill') === 'url(#grid-dots)'
    if (bg) {
      if (mode === 'linking') { cancelLinking(); return }
      clearSelection()
      panRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [mode, cancelLinking, clearSelection])

  const onCtxMenu = useCallback((e) => {
    e.preventDefault()
    onContextMenu(e.clientX, e.clientY, null)
  }, [onContextMenu])

  const centerZoom = (factor) => {
    const el = wrapperRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    applyZoomRef(factor, r.width / 2, r.height / 2)
    commit()
  }

  const { offset, scale } = renderKey

  return (
    <div
      ref={wrapperRef}
      className={`canvas-wrapper${mode === 'linking' ? ' linking' : ''}`}
      onMouseDown={onMouseDown}
      onContextMenu={onCtxMenu}
    >
      <GridDots scale={scale} offsetX={offset.x} offsetY={offset.y} />

      {mode === 'linking' && linkingFrom && (
        <div className="linking-hint">Touchez l'entité cible</div>
      )}

      <div
        className="canvas-inner"
        style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
      >
        {groups.map(g => <GroupRect key={g.id} group={g} entities={entities} />)}
        <svg style={{ position:'absolute', top:0, left:0, overflow:'visible', width:0, height:0, pointerEvents:'all' }}>
          {links.map(link => <LinkLine key={link.id} link={link} entities={entities} />)}
        </svg>
        {entities.map(entity => <EntityNode key={entity.id} entity={entity} scale={scale} />)}
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => centerZoom(1.3)}>+</button>
        <button className="zoom-btn" onClick={() => { scaleRef.current=1; offsetRef.current={x:60,y:60}; commit() }} style={{fontSize:10}}>1:1</button>
        <button className="zoom-btn" onClick={() => centerZoom(1/1.3)}>−</button>
      </div>

      <div className="status-bar">
        <span>{Math.round(scale * 100)}%</span>
        <span className="sep">·</span>
        <span>{entities.length} entité{entities.length !== 1 ? 's' : ''}</span>
        <span className="sep">·</span>
        <span>{links.length} lien{links.length !== 1 ? 's' : ''}</span>
        <span className="sep">·</span>
        <span style={{ color:'var(--accent-green)', fontSize:9 }}>● saved</span>
      </div>
    </div>
  )
}
