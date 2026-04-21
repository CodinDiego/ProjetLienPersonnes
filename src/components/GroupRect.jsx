import React from 'react'
import useGraphStore from '../store/useGraphStore'
import { getEntityBounds } from './EntityNode'

const PADDING = 24
const STROKE = {
  blue: 'rgba(86,156,214,0.5)', cyan: 'rgba(78,201,176,0.5)', purple: 'rgba(197,134,192,0.5)',
  orange: 'rgba(206,145,120,0.5)', green: 'rgba(106,153,85,0.5)', yellow: 'rgba(220,220,170,0.5)',
  red: 'rgba(244,71,71,0.5)', pink: 'rgba(244,143,177,0.5)', indigo: 'rgba(121,134,203,0.5)',
  teal: 'rgba(38,166,154,0.5)', lime: 'rgba(174,213,129,0.5)', amber: 'rgba(255,202,40,0.5)',
  coral: 'rgba(255,112,67,0.5)', sky: 'rgba(41,182,246,0.5)', white: 'rgba(224,224,224,0.5)',
  gold: 'rgba(255,215,0,0.5)',
}
const FILL = {
  blue: 'rgba(86,156,214,0.06)', cyan: 'rgba(78,201,176,0.06)', purple: 'rgba(197,134,192,0.06)',
  orange: 'rgba(206,145,120,0.06)', green: 'rgba(106,153,85,0.06)', yellow: 'rgba(220,220,170,0.06)',
  red: 'rgba(244,71,71,0.06)', pink: 'rgba(244,143,177,0.06)', indigo: 'rgba(121,134,203,0.06)',
  teal: 'rgba(38,166,154,0.06)', lime: 'rgba(174,213,129,0.06)', amber: 'rgba(255,202,40,0.06)',
  coral: 'rgba(255,112,67,0.06)', sky: 'rgba(41,182,246,0.06)', white: 'rgba(224,224,224,0.06)',
  gold: 'rgba(255,215,0,0.06)',
}

export default function GroupRect({ group, entities }) {
  const { selectedGroupId, selectGroup } = useGraphStore()
  const isSelected = selectedGroupId === group.id

  const members = entities.filter(e => group.entityIds.includes(e.id))
  if (members.length === 0) return null

  const bounds = members.map(getEntityBounds)

  const minX = Math.min(...bounds.map(b => b.x)) - PADDING
  const minY = Math.min(...bounds.map(b => b.y)) - PADDING - 10
  const maxX = Math.max(...bounds.map(b => b.x + b.w)) + PADDING
  const maxY = Math.max(...bounds.map(b => b.y + b.h)) + PADDING

  const strokeColor = STROKE[group.color] || STROKE.blue
  const fillColor   = FILL[group.color]   || FILL.blue
  const w = maxX - minX
  const h = maxY - minY

  return (
    <div
      className={`group-rect${isSelected ? ' selected' : ''}`}
      style={{
        left: minX, top: minY, width: w, height: h,
        borderColor: strokeColor,
        background: fillColor,
        zIndex: 1,                   // below links (2) and entities (5+)
        outline: isSelected ? `2px solid ${strokeColor}` : 'none',
        outlineOffset: 2,
        // Fill is transparent to clicks — only the border + label respond
        pointerEvents: 'none',
        cursor: 'default',
      }}
    >
      {/* Clickable border strip via inner absolute overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          border: '12px solid transparent',
          borderRadius: 'inherit',
          boxSizing: 'border-box',
          cursor: 'pointer',
          pointerEvents: 'all',
          zIndex: 2,
        }}
        onClick={(e) => { e.stopPropagation(); selectGroup(group.id) }}
      />
      <span
        className="group-label"
        style={{
          color: strokeColor.replace('0.5', '0.95'),
          background: 'var(--bg-primary)',
          pointerEvents: 'all',
          cursor: 'pointer',
          zIndex: 3,
          position: 'relative',
        }}
        onClick={(e) => { e.stopPropagation(); selectGroup(group.id) }}
      >
        {group.name}
      </span>
    </div>
  )
}
