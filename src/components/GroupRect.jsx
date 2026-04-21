import React from 'react'
import useGraphStore from '../store/useGraphStore.js'
import { getEntityBounds } from './EntityNode.jsx'

const PADDING = 24
const COLORS = {
  blue: 'rgba(0, 122, 204, 0.35)',
  cyan: 'rgba(78, 201, 176, 0.35)',
  orange: 'rgba(206, 145, 120, 0.35)',
  purple: 'rgba(197, 134, 192, 0.35)',
  green: 'rgba(106, 153, 85, 0.35)',
  yellow: 'rgba(220, 220, 170, 0.35)',
}

const FILL_COLORS = {
  blue: 'rgba(0, 122, 204, 0.06)',
  cyan: 'rgba(78, 201, 176, 0.06)',
  orange: 'rgba(206, 145, 120, 0.06)',
  purple: 'rgba(197, 134, 192, 0.06)',
  green: 'rgba(106, 153, 85, 0.06)',
  yellow: 'rgba(220, 220, 170, 0.06)',
}

export default function GroupRect({ group, entities, scale }) {
  const { selectedGroupId, selectGroup } = useGraphStore()
  const isSelected = selectedGroupId === group.id

  const members = entities.filter(e => group.entityIds.includes(e.id))
  if (members.length === 0) return null

  const bounds = members.map(getEntityBounds)

  const minX = Math.min(...bounds.map(b => b.x)) - PADDING
  const minY = Math.min(...bounds.map(b => b.y)) - PADDING - 10
  const maxX = Math.max(...bounds.map(b => b.x + b.w)) + PADDING
  const maxY = Math.max(...bounds.map(b => b.y + b.h)) + PADDING

  const strokeColor = COLORS[group.color] || COLORS.blue
  const fillColor = FILL_COLORS[group.color] || FILL_COLORS.blue
  const textColor = (COLORS[group.color] || COLORS.blue).replace('0.35', '0.9')

  return (
    <div
      className={`group-rect${isSelected ? ' selected' : ''}`}
      style={{
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY,
        borderColor: strokeColor,
        background: fillColor,
        zIndex: 1,
        outline: isSelected ? `2px solid ${strokeColor}` : 'none',
        outlineOffset: 2,
        cursor: 'pointer',
        pointerEvents: 'all',
      }}
      onClick={(e) => { e.stopPropagation(); selectGroup(group.id) }}
    >
      <span
        className="group-label"
        style={{ color: textColor, background: 'var(--bg-primary)' }}
      >
        {group.name}
      </span>
    </div>
  )
}
