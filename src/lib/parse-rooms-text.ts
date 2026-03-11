import type { ScrapedRoom } from './scrape-vrbo'

const BED_TEXT_MAP: Record<string, string> = {
  'king bed': 'King',        'king beds': 'King',
  'queen bed': 'Queen',      'queen beds': 'Queen',
  'full bed': 'Full',        'full beds': 'Full',
  'double bed': 'Full',      'double beds': 'Full',
  'twin bed': 'Twin',        'twin beds': 'Twin',
  'single bed': 'Twin',      'single beds': 'Twin',
  'twin bunk bed': 'Bunk',   'twin bunk beds': 'Bunk',
  'bunk bed': 'Bunk',        'bunk beds': 'Bunk',
  'sofa bed': 'Sofa Bed',    'sofa beds': 'Sofa Bed',
  'sleeper sofa': 'Sofa Bed',
}

export function parseRoomsText(text: string): ScrapedRoom[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const rooms: ScrapedRoom[] = []
  let current: ScrapedRoom | null = null

  for (const line of lines) {
    // Skip summary lines: "9 bedrooms (sleeps 35)"
    if (/^\d+\s+bedrooms?/i.test(line)) continue

    if (/^\d/.test(line)) {
      // Bed line: "1 Queen Bed and 1 Twin Bunk Bed"
      if (!current) continue
      for (const part of line.split(/\s+and\s+/i)) {
        const m = part.trim().match(/^(\d+)\s+(.+)$/i)
        if (!m) continue
        const qty = parseInt(m[1])
        const mapped = BED_TEXT_MAP[m[2].toLowerCase()]
        if (!mapped) continue
        for (let k = 0; k < qty; k++) current.beds.push({ type: mapped })
      }
    } else {
      // Room name line
      if (current?.beds.length) rooms.push(current)
      current = { name: line, beds: [] }
    }
  }

  if (current?.beds.length) rooms.push(current)
  return rooms
}
