import type { PropsWithChildren } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePlatformAuth } from '../hooks/usePlatformAuth'
import { PlatformNavbar } from './PlatformNavbar'

export function PlatformShell({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { logout } = usePlatformAuth()

  async function handleLogout() {
    await logout()
    navigate('/platform/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 scheme-dark">
      <PlatformNavbar />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link to="/platform/dashboard">
              <p className="text-sm font-semibold text-white">DriveFlow</p>
              <p className="text-xs text-zinc-500">Platform console</p>
            </Link>
            <div className="flex items-center gap-2 text-xs font-medium">
              <Link
                className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300"
                to="/platform/tenants"
              >
                Tenants
              </Link>
              <Link
                className="rounded-lg bg-white px-3 py-2 text-black"
                to="/platform/tenants/new"
              >
                Create
              </Link>
              <button
                className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-400"
                type="button"
                onClick={() => void handleLogout()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}
