import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6 text-zinc-600 dark:text-zinc-400">Page not found</p>
      <Link
        to="/"
        className="inline-block px-4 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600"
      >
        Go to Home
      </Link>
    </div>
  )
}


