'use client'

import { useDroppable } from '@dnd-kit/core'
import PersonChip from './PersonChip'

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
      className={`border-2 rounded-xl p-3 min-w-[140px] min-h-[90px] flex flex-col gap-2 transition-colors ${
        isOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-base">{BED_ICONS[type] ?? '🛏️'}</span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-700 truncate">
            {label || type}
          </div>
          {label && (
            <div className="text-xs text-gray-400">{type}</div>
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
          <span className="text-xs text-gray-300 italic">Drop here</span>
        )}
      </div>
    </div>
  )
}
