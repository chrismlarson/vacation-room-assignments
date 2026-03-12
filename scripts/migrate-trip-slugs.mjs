import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function slugify(name) {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  const trips = await prisma.trip.findMany()

  // Cuids are 25 chars, start with 'c', no hyphens — those need migration
  const toMigrate = trips.filter(t => /^c[a-z0-9]{24}$/.test(t.id))

  if (toMigrate.length === 0) {
    console.log('No trips need migration.')
    return
  }

  console.log(`Migrating ${toMigrate.length} trip(s)...`)

  // Track all IDs that will be in use after migration to avoid collisions
  const takenIds = new Set(trips.map(t => t.id))
  toMigrate.forEach(t => takenIds.delete(t.id)) // old cuids will be replaced

  for (const trip of toMigrate) {
    const base = slugify(trip.name) || 'trip'
    let slug = base
    let i = 1
    while (takenIds.has(slug)) {
      slug = `${base}-${i++}`
    }
    takenIds.add(slug)

    await prisma.$transaction(async (tx) => {
      // Defer FK checks to commit so we can update both sides without ordering issues
      await tx.$executeRaw`PRAGMA defer_foreign_keys = ON`
      await tx.$executeRaw`UPDATE "Family" SET "tripId" = ${slug} WHERE "tripId" = ${trip.id}`
      await tx.$executeRaw`UPDATE "Person" SET "tripId" = ${slug} WHERE "tripId" = ${trip.id}`
      await tx.$executeRaw`UPDATE "Room"   SET "tripId" = ${slug} WHERE "tripId" = ${trip.id}`
      await tx.$executeRaw`UPDATE "Trip"   SET "id"     = ${slug} WHERE "id"     = ${trip.id}`
    })

    console.log(`  ${trip.id}  →  ${slug}  (${trip.name})`)
  }

  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
