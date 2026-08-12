import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/lib/api/api-client'
import { listPlatformTenants } from '../api/platform-tenant-api'
import { PlatformShell } from '../components/PlatformShell'
import type {
  PlatformTenant,
  TenantStatus,
} from '../types/platform-tenant'
import {
  formatPlatformDate,
  tenantStatusClass,
} from '../utils/platform-formatters'

type StatusFilter = 'ALL' | TenantStatus

export function TenantListPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadTenants() {
      setIsLoading(true)
      setError(null)

      try {
        const tenantData = await listPlatformTenants()
        if (isActive) {
          setTenants(tenantData)
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load tenants.',
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadTenants()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase()

    return tenants.filter((tenant) => {
      const matchesStatus =
        statusFilter === 'ALL' || tenant.status === statusFilter
      const matchesSearch =
        !query ||
        [
          tenant.name,
          tenant.slug,
          tenant.contactEmail ?? '',
          tenant.primaryLocationCity ?? '',
        ].some((value) => value.toLowerCase().includes(query))

      return matchesStatus && matchesSearch
    })
  }, [search, statusFilter, tenants])

  return (
    <PlatformShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
              Tenant management
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Tenant registry
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Search, inspect, and manage every dealership registered on the platform.
            </p>
          </div>
          <Link
            className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
            to="/platform/tenants/new"
          >
            + Create tenant
          </Link>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:p-5">
            <label className="sr-only" htmlFor="tenant-search">
              Search tenants
            </label>
            <input
              id="tenant-search"
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-600"
              type="search"
              placeholder="Search name, slug, email, or city"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className="sr-only" htmlFor="tenant-status-filter">
              Filter by status
            </label>
            <select
              id="tenant-status-filter"
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <button
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Refresh
            </button>
          </div>

          {error ? (
            <div className="m-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200" role="alert">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <p className="px-6 py-16 text-center text-sm text-zinc-500">
              Loading tenants…
            </p>
          ) : filteredTenants.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-zinc-300">
                {tenants.length === 0
                  ? 'No tenants have been created yet.'
                  : 'No tenants match these filters.'}
              </p>
              {tenants.length === 0 ? (
                <Link
                  className="mt-3 inline-block text-sm font-semibold text-white underline underline-offset-4"
                  to="/platform/tenants/new"
                >
                  Create the first tenant
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-5xl border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                    <th className="px-6 py-3 font-semibold">Tenant</th>
                    <th className="px-4 py-3 font-semibold">Primary city</th>
                    <th className="px-4 py-3 font-semibold">Locations</th>
                    <th className="px-4 py-3 font-semibold">Users</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredTenants.map((tenant) => (
                    <tr className="transition hover:bg-zinc-800/40" key={tenant.id}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-zinc-200">
                          {tenant.name}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-zinc-600">
                          {tenant.slug}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">
                        {tenant.primaryLocationCity ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">
                        {tenant.locationCount}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-400">
                        {tenant.userCount}
                      </td>
                      <td className="px-4 py-4 text-sm text-zinc-500">
                        {formatPlatformDate(tenant.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${tenantStatusClass(tenant.status)}`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white hover:text-black"
                          to={`/platform/tenants/${tenant.id}`}
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && tenants.length > 0 ? (
            <div className="border-t border-zinc-800 px-5 py-4 text-xs text-zinc-500">
              Showing {filteredTenants.length} of {tenants.length} tenants
            </div>
          ) : null}
        </section>
      </div>
    </PlatformShell>
  )
}
