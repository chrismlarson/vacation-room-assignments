'use client'

import { useDroppable } from '@dnd-kit/core'
import PersonChip from './PersonChip'

const BED_MIN_WIDTH: Record<string, string> = {
  King:       'min-w-[180px]',
  Queen:      'min-w-[160px]',
  Full:       'min-w-[140px]',
  Twin:       'min-w-[120px]',
  'Sofa Bed': 'min-w-[140px]',
  Bunk:       'min-w-[120px]',
}

const BED_ICONS: Record<string, string> = {
  King: '👑',
  Queen: '🛏️',
  Full: '🛏️',
  Twin: '🛏',
  'Sofa Bed': '🛋️',
  Bunk: '📚',
}

interface AssignedPerson {
  id: string
  name: string
  color: string
}

interface BedCardProps {
  id: string
  type: string
  label?: string | null
  assignedPeople: AssignedPerson[]
  onUnassign: (personId: string) => void
}

export default function BedCard({ id, type, label, assignedPeople, onUnassign }: BedCardProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `bed-${id}` })

  return (
    <div
      ref={setNodeRef}
      className={`border-2 rounded-xl p-3 ${BED_MIN_WIDTH[type] ?? 'min-w-[140px]'} min-h-[90px] flex flex-col gap-2 transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-950'
          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base">{BED_ICONS[type] ?? '🛏️'}</span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-300 truncate">
            {label || type}
          </div>
          {label && (
            <div className="text-xs text-gray-500">{type}</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 min-h-[24px]">
        {assignedPeople.map((person) => (
          <PersonChip
            key={person.id}
            id={person.id}
            name={person.name}
            color={person.color}
            onRemove={() => onUnassign(person.id)}
            compact
          />
        ))}
        {assignedPeople.length === 0 && (
          <span className="text-xs text-gray-600 italic">Drop here</span>
        )}
      </div>
    </div>
  )
}
