import React from 'react'
import useGraphStore from '../store/useGraphStore.js'
import { getEntityBounds } from './EntityNode.jsx'

function getAnchorPoint(bounds, dx, dy) {
  const cx = bounds.x + bounds.w / 2
  const cy = bounds.y + bounds.h / 2

  // Intersect ray from center towards direction (dx,dy) with bounding box
  const hw = bounds.w / 2
  const hh = bounds.h / 2

  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  const scaleX = dx !== 0 ? Math.abs(hw / dx) : Infinity
  const scaleY = dy !== 0 ? Math.abs(hh / dy) : Infinity
  const s = Math.min(scaleX, scaleY)

  return {
    x: cx + dx * s,
    y: cy + dy * s,
  }
}

export default function LinkLine({ link, entities }) {
  const { selectedLinkId, selectLink, deleteLink } = useGraphStore()
  const isSelected = selectedLinkId === link.id

  const fromEntity = entities.find(e => e.id === link.from)
  const toEntity = entities.find(e => e.id === link.to)
  if (!fromEntity || !toEntity) return null

  const fromB = getEntityBounds(fromEntity)
  const toB = getEntityBounds(toEntity)

  const fromCx = fromB.x + fromB.w / 2
  const fromCy = fromB.y + fromB.h / 2
  const toCx = toB.x + toB.w / 2
  const toCy = toB.y + toB.h / 2

  const dx = toCx - fromCx
  const dy = toCy - fromCy
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return null

  const ndx = dx / len
  const ndy = dy / len

  const start = getAnchorPoint(fromB, ndx, ndy)
  const end = getAnchorPoint(toB, -ndx, -ndy)

  // Bezier curve
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const curvature = Math.min(60, len * 0.25)
  const perpX = -ndy * curvature
  const perpY = ndx * curvature

  const cp1x = start.x + ndx * len * 0.35 + perpX * 0.3
  const cp1y = start.y + ndy * len * 0.35 + perpY * 0.3
  const cp2x = end.x - ndx * len * 0.35 + perpX * 0.3
  const cp2y = end.y - ndy * len * 0.35 + perpY * 0.3

  const d = `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`

  const markerId = `arrow-${link.id}`
  const markerIdStart = `arrow-start-${link.id}`
  const strokeColor = isSelected ? 'var(--accent-blue)' : 'var(--link-color)'

  const hasLabel = link.label && link.label.trim()
  const labelLen = hasLabel ? link.label.length * 6 + 16 : 0
  const labelH = 16

  return (
    <g>
      <defs>
        {(link.type === 'arrow' || link.type === 'bidirectional') && (
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={isSelected ? 'var(--accent-blue)' : 'var(--link-color)'} />
          </marker>
        )}
        {link.type === 'bidirectional' && (
          <marker
            id={markerIdStart}
            markerWidth="8"
            markerHeight="8"
            refX="2"
            refY="3"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={isSelected ? 'var(--accent-blue)' : 'var(--link-color)'} />
          </marker>
        )}
      </defs>

      {/* Invisible wide hit area */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth="16"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onClick={(e) => { e.stopPropagation(); selectLink(link.id) }}
      />

      {/* Visible path */}
      <path
        d={d}
        className={`link-path${isSelected ? ' selected' : ''}`}
        markerEnd={
          link.type === 'arrow' || link.type === 'bidirectional'
            ? `url(#${markerId})`
            : undefined
        }
        markerStart={
          link.type === 'bidirectional'
            ? `url(#${markerIdStart})`
            : undefined
        }
        style={{ pointerEvents: 'none' }}
      />

      {/* Label */}
      {hasLabel && (
        <g transform={`translate(${midX + perpX * 0.4}, ${midY + perpY * 0.4})`}>
          <rect
            x={-labelLen / 2}
            y={-labelH / 2}
            width={labelLen}
            height={labelH}
            rx="3"
            className="link-label-bg"
          />
          <text className="link-label-text">{link.label}</text>
        </g>
      )}
    </g>
  )
}
