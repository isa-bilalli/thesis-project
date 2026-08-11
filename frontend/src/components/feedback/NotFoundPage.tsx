import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center text-slate-100">
      <section>
        <p className="text-sm font-semibold text-sky-400">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-slate-400">The page you requested does not exist.</p>
        <Link
          className="mt-6 inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:border-slate-500"
          to="/"
        >
          Go home
        </Link>
      </section>
    </main>
  )
}
