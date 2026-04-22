import React from 'react'
import useGraphStore from '../store/useGraphStore'
import { getEntityBounds } from './EntityNode'

const PADDING = 24
const STROKE = {
  blue: '#569cd6', cyan: '#4ec9b0', purple: '#c586c0', orange: '#ce9178',
  green: '#6a9955', yellow: '#dcdcaa', red: '#f44747', pink: '#f48fb1',
  indigo: '#7986cb', teal: '#26a69a', lime: '#aed581', amber: '#ffca28',
  coral: '#ff7043', sky: '#29b6f6', white: '#e0e0e0', gold: '#ffd700',
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
  const w = maxX - minX
  const h = maxY - minY

  const color = STROKE[group.color] || STROKE.blue

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); selectGroup(group.id) }}
    >
      {/* Fill transparent — clicks pass through to entities/links underneath */}
      <rect
        x={minX} y={minY} width={w} height={h}
        rx={10}
        fill="transparent"
        stroke="none"
        style={{ pointerEvents: 'none' }}
      />

      {/* Visible fill (very subtle) - no pointer events */}
      <rect
        x={minX} y={minY} width={w} height={h}
        rx={10}
        fill={color}
        fillOpacity={0.06}
        stroke="none"
        style={{ pointerEvents: 'none' }}
      />

      {/* Invisible thick border for easier clicking */}
      <rect
        x={minX} y={minY} width={w} height={h}
        rx={10}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
      />

      {/* Border only - clickable via stroke */}
      <rect
        x={minX} y={minY} width={w} height={h}
        rx={10}
        fill="none"
        stroke={color}
        strokeOpacity={isSelected ? 0.9 : 0.45}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray="6 4"
        style={{ pointerEvents: 'stroke' }}
      />

      {/* Label background */}
      <rect
        x={minX + 12} y={minY - 9}
        width={group.name.length * 7 + 12} height={18}
        rx={3}
        fill="var(--bg-primary)"
        style={{ pointerEvents: 'none' }}
      />

      {/* Label text */}
      <text
        x={minX + 18} y={minY + 3}
        fill={color}
        fontSize={11}
        fontFamily="var(--font-mono)"
        fontWeight={500}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {group.name}
      </text>
    </g>
  )
}
