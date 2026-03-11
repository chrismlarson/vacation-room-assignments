'use client'

import { useDraggable } from '@dnd-kit/core'

interface PersonChipProps {
  id: string
  name: string
  color: string
  onRemove?: () => void
  compact?: boolean
}

export default function PersonChip({ id, name, color, onRemove, compact }: PersonChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `person-${id}`,
    data: { personId: id, name, color },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: color, opacity: isDragging ? 0.4 : 1 }}
      className={`inline-flex items-center gap-1 rounded-full text-white text-xs font-medium cursor-grab active:cursor-grabbing select-none touch-none ${
        compact ? 'px-2 py-0.5' : 'px-3 py-1'
      }`}
      {...listeners}
      {...attributes}
    >
      <span>{name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:opacity-75 font-bold leading-none"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      )}
    </div>
  )
}

// Static chip used in overlay (no drag hooks)
export function PersonChipStatic({
  name,
  color,
}: {
  name: string
  color: string
}) {
  return (
    <div
      style={{ backgroundColor: color }}
      className="inline-flex items-center rounded-full text-white text-xs font-medium px-3 py-1 cursor-grabbing select-none"
    >
      {name}
    </div>
  )
}
