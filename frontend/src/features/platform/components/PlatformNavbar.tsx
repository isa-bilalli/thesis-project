import { NavLink, useNavigate } from 'react-router-dom'
import { usePlatformAuth } from '../hooks/usePlatformAuth'

const navigation = [
  { label: 'Dashboard', to: '/platform/dashboard', end: true },
  { label: 'Tenants', to: '/platform/tenants', end: true },
  { label: 'Create tenant', to: '/platform/tenants/new', end: true },
]

export function PlatformNavbar() {
  const navigate = useNavigate()
  const { user, logout } = usePlatformAuth()
  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'PA'

  async function handleLogout() {
    await logout()
    navigate('/platform/login', { replace: true })
  }

  return (
    <>
      <div className="hidden w-64 shrink-0 lg:block" aria-hidden="true" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 text-zinc-300 lg:flex">
      <div className="flex h-16 items-center px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">
            D
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">DriveFlow</h1>
            <p className="text-xs text-zinc-500">Platform console</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
          <p className="text-xs text-zinc-500">Environment</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-sm font-medium text-white">Development</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Platform navigation">
        <p className="mb-3 px-3 text-[11px] font-semibold tracking-wider text-zinc-600 uppercase">
          Platform
        </p>
        <div className="mx-2 flex flex-col space-y-2 text-center">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `rounded-xl border p-3 font-medium transition ${
                  isActive
                    ? 'border-zinc-700 bg-white text-black'
                    : 'border-zinc-800 bg-zinc-900/60 text-white hover:bg-zinc-900'
                }`
              }
              key={item.to}
              to={item.to}
              end={item.end}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 rounded-xl bg-zinc-900/70 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user ? `${user.firstName} ${user.lastName}` : 'Platform Admin'}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {user?.email ?? 'System administrator'}
            </p>
          </div>
          <button
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
            type="button"
            onClick={() => void handleLogout()}
          >
            Sign out
          </button>
        </div>
      </div>
      </aside>
    </>
  )
}
