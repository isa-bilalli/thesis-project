import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { PermissionCode } from '@/features/auth/types/auth'

interface NavigationItem {
  label: string
  shortLabel: string
  to: string
  permission?: PermissionCode
  end?: boolean
}

interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', shortLabel: 'DB', to: '/dashboard', end: true },
      {
        label: 'Inventory',
        shortLabel: 'IN',
        to: '/inventory',
        permission: 'inventory.read',
      },
      {
        label: 'Customers',
        shortLabel: 'CU',
        to: '/customers',
        permission: 'crm.read',
      },
      {
        label: 'Leads',
        shortLabel: 'LD',
        to: '/leads',
        permission: 'crm.read',
      },
      {
        label: 'Test drives',
        shortLabel: 'TD',
        to: '/test-drives',
        permission: 'crm.read',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        label: 'Offers',
        shortLabel: 'OF',
        to: '/offers',
        permission: 'sales.read',
      },
      {
        label: 'Reservations',
        shortLabel: 'RS',
        to: '/reservations',
        permission: 'sales.read',
      },
      {
        label: 'Sales',
        shortLabel: 'SL',
        to: '/sales',
        permission: 'sales.read',
      },
      {
        label: 'Reports',
        shortLabel: 'RP',
        to: '/reports',
        permission: 'reports.read',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Users',
        shortLabel: 'US',
        to: '/users',
        permission: 'users.manage',
      },
      {
        label: 'Locations',
        shortLabel: 'LC',
        to: '/locations',
        permission: 'locations.manage',
      },
    ],
  },
]

function formatRole(role: string | undefined): string {
  if (!role) {
    return 'Team member'
  }

  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function TenantNavigation({
  groups,
  onNavigate,
}: {
  groups: NavigationGroup[]
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 space-y-6 px-3 py-4" aria-label="Dealership navigation">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`
                }
                end={item.end}
                key={item.to}
                to={item.to}
                onClick={onNavigate}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5 text-[9px] font-bold tracking-wide">
                  {item.shortLabel}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function Navbar() {
  const navigate = useNavigate()
  const { user, hasPermission, logout } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)

  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || hasPermission(item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0)

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'DF'
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'DriveFlow user'
  const role = formatRole(user?.roles[0])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="hidden w-64 shrink-0 lg:block" aria-hidden="true" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300 lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">
              D
            </div>
            <div>
              <p className="text-sm font-semibold text-white">DriveFlow</p>
              <p className="text-xs text-zinc-500">Dealership OS</p>
            </div>
          </div>
        </div>

        <div className="px-3 py-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
            <p className="text-xs text-zinc-500">Dealership</p>
            <p className="mt-1 truncate text-sm font-medium text-white">
              {user?.tenant?.name ?? 'Your dealership'}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active workspace
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <TenantNavigation groups={visibleGroups} />
        </div>

        <div className="relative px-3 pb-4 pt-2">
          {isAccountOpen ? (
            <div className="absolute right-3 bottom-full left-3 mb-2 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 p-1 shadow-2xl">
              <NavLink
                className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                to="/settings"
                onClick={() => setIsAccountOpen(false)}
              >
                Account settings
              </NavLink>
              <button
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-400/10"
                type="button"
                onClick={() => void handleLogout()}
              >
                Sign out
              </button>
            </div>
          ) : null}

          <button
            className="flex w-full items-center gap-3 rounded-xl bg-zinc-900/70 p-3 text-left transition hover:bg-zinc-900"
            type="button"
            aria-expanded={isAccountOpen}
            onClick={() => setIsAccountOpen((open) => !open)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {fullName}
              </span>
              <span className="block truncate text-xs text-zinc-500">{role}</span>
            </span>
            <span className="text-xs text-zinc-600" aria-hidden="true">
              {isAccountOpen ? '×' : '•••'}
            </span>
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-black">
            D
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user?.tenant?.name ?? 'DriveFlow'}
            </p>
            <p className="text-[11px] text-zinc-500">Dealership workspace</p>
          </div>
        </div>
        <button
          className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300"
          type="button"
          aria-controls="mobile-tenant-navigation"
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          {isMobileOpen ? 'Close' : 'Menu'}
        </button>
      </header>

      {isMobileOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
        />
      ) : null}

      <aside
        id="mobile-tenant-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(20rem,88vw)] flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300 transition-transform duration-200 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
          <div>
            <p className="text-sm font-semibold text-white">DriveFlow</p>
            <p className="text-xs text-zinc-500">{user?.tenant?.name}</p>
          </div>
          <button
            className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900"
            type="button"
            onClick={() => setIsMobileOpen(false)}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <TenantNavigation
            groups={visibleGroups}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>

        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{fullName}</p>
              <p className="truncate text-xs text-zinc-500">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <NavLink
              className="rounded-lg border border-zinc-800 px-3 py-2 text-center text-xs font-medium text-zinc-300"
              to="/settings"
              onClick={() => setIsMobileOpen(false)}
            >
              Settings
            </NavLink>
            <button
              className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-medium text-red-300"
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

export default Navbar
