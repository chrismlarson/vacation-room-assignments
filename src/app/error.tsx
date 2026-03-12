'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4 text-gray-400">
      <p className="text-lg">Something went wrong.</p>
      <button onClick={reset} className="text-blue-500 hover:underline text-sm">
        Try again
      </button>
    </main>
  )
}
