'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

export default function NewTripPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [listingUrl, setListingUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Trip name is required')
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), listingUrl: listingUrl.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to create trip')
      const trip = await res.json()
      const isVrbo = listingUrl.trim().toLowerCase().includes('vrbo.com')
      if (isVrbo) {
        const qs = trip.importError ? '?importFailed=1' : ''
        router.push(`/trips/${trip.id}/setup${qs}`)
      } else {
        router.push(`/trips/${trip.id}`)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-300">
          ← Back to trips
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-50 mb-6">New Trip</h1>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Trip Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lake Tahoe 2025"
            className="w-full border border-gray-600 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Listing URL <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={listingUrl}
            onChange={(e) => setListingUrl(e.target.value)}
            placeholder="https://airbnb.com/rooms/..."
            className="w-full border border-gray-600 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? (listingUrl.toLowerCase().includes('vrbo.com') ? 'Creating and importing rooms...' : 'Creating...') : 'Create Trip'}
        </button>
      </form>
    </main>
  )
}
