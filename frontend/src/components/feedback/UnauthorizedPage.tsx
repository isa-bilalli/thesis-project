import { Link } from 'react-router-dom'

export function UnauthorizedPage() {
  return (
    <section className="max-w-xl">
      <p className="text-sm font-semibold text-amber-400">Access denied</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">
        You do not have permission to view this page.
      </h1>
      <p className="mt-3 text-slate-400">
        Ask an administrator to update your role if you think you should have access.
      </p>
      <Link
        className="mt-6 inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        to="/dashboard"
      >
        Return to dashboard
      </Link>
    </section>
  )
}
