export interface ScrapedRoom {
  name: string
  beds: { type: string }[]
}

export interface ScrapeResult {
  success: boolean
  rooms: ScrapedRoom[]
  error?: string
}

const BED_TYPE_MAP: Record<string, string> = {
  KING_BED: 'King',
  QUEEN_BED: 'Queen',
  FULL_BED: 'Full',
  DOUBLE_BED: 'Full',
  TWIN_BED: 'Twin',
  SINGLE_BED: 'Twin',
  BUNK_BED: 'Bunk',
  SOFA_BED: 'Sofa Bed',
  SLEEPER_SOFA: 'Sofa Bed',
}

function findSleepingArrangements(obj: unknown): unknown[] | null {
  if (!obj || typeof obj !== 'object') return null
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findSleepingArrangements(item)
      if (result) return result
    }
    return null
  }
  const record = obj as Record<string, unknown>
  if ('sleepingArrangements' in record && Array.isArray(record.sleepingArrangements)) {
    return record.sleepingArrangements as unknown[]
  }
  for (const key of Object.keys(record)) {
    const result = findSleepingArrangements(record[key])
    if (result) return result
  }
  return null
}

function getNestedValue(obj: unknown, path: string[]): unknown {
  let current = obj
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export async function scrapeVrbo(url: string): Promise<ScrapeResult> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!res.ok) {
      return { success: false, rooms: [], error: `HTTP ${res.status}` }
    }

    const html = await res.text()
    const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) {
      return { success: false, rooms: [], error: '__NEXT_DATA__ not found' }
    }

    const data = JSON.parse(match[1])

    const candidatePaths = [
      ['props', 'pageProps', 'initialData', 'data', 'presentation', 'propertyDetails', 'sleepingArrangements'],
      ['props', 'pageProps', 'initialData', 'data', 'propertyDetails', 'sleepingArrangements'],
      ['props', 'pageProps', 'propertyDetails', 'sleepingArrangements'],
    ]

    let arrangements: unknown[] | null = null
    for (const path of candidatePaths) {
      const parentPath = path.slice(0, -1)
      const parent = getNestedValue(data, parentPath)
      if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
        const val = (parent as Record<string, unknown>)[path[path.length - 1]]
        if (Array.isArray(val)) {
          arrangements = val as unknown[]
          break
        }
      }
    }

    if (!arrangements) {
      arrangements = findSleepingArrangements(data)
    }

    if (!arrangements) {
      return { success: false, rooms: [], error: 'sleepingArrangements not found' }
    }

    const rooms: ScrapedRoom[] = []
    for (const entry of arrangements) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      const roomName = typeof e.name === 'string' ? e.name : 'Room'
      const bedConfigs = Array.isArray(e.beds) ? (e.beds as unknown[]) : []
      const beds: { type: string }[] = []
      for (const bedEntry of bedConfigs) {
        if (!bedEntry || typeof bedEntry !== 'object') continue
        const b = bedEntry as Record<string, unknown>
        const rawType = typeof b.type === 'string' ? b.type : ''
        const mappedType = BED_TYPE_MAP[rawType]
        if (!mappedType) continue
        const quantity = typeof b.quantity === 'number' ? b.quantity : 1
        for (let k = 0; k < quantity; k++) {
          beds.push({ type: mappedType })
        }
      }
      if (beds.length > 0) {
        rooms.push({ name: roomName, beds })
      }
    }

    return { success: true, rooms }
  } catch (err) {
    return { success: false, rooms: [], error: String(err) }
  }
}
