import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-4xl font-bold text-gray-50">404</h1>
      <p className="text-gray-400">Page not found.</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Back to trips
      </Link>
    </div>
  )
}
