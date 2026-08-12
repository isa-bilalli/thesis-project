import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/lib/api/api-client'
import {
  getPlatformHealth,
  listPlatformTenants,
} from '../api/platform-tenant-api'
import { PlatformShell } from '../components/PlatformShell'
import type {
  PlatformHealth,
  PlatformTenant,
} from '../types/platform-tenant'
import {
  formatPlatformDate,
  tenantStatusClass,
} from '../utils/platform-formatters'

const unavailableHealth: PlatformHealth = {
  status: 'unhealthy',
  database: 'disconnected',
}

export function PlatformDashboardPage() {
  const [tenants, setTenants] = useState<PlatformTenant[]>([])
  const [health, setHealth] = useState<PlatformHealth>(unavailableHealth)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const [tenantData, healthData] = await Promise.all([
          listPlatformTenants(),
          getPlatformHealth().catch(() => unavailableHealth),
        ])

        if (isActive) {
          setTenants(tenantData)
          setHealth(healthData)
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load platform data.',
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  const summary = useMemo(() => {
    const totalUsers = tenants.reduce(
      (total, tenant) => total + Number(tenant.userCount),
      0,
    )
    const active = tenants.filter((tenant) => tenant.status === 'ACTIVE').length
    const suspended = tenants.filter(
      (tenant) => tenant.status === 'SUSPENDED',
    ).length
    const inactive = tenants.filter(
      (tenant) => tenant.status === 'INACTIVE',
    ).length

    return { active, inactive, suspended, totalUsers }
  }, [tenants])

  const summaryCards = [
    {
      label: 'Total tenants',
      value: tenants.length,
      note: `${summary.totalUsers} provisioned user${summary.totalUsers === 1 ? '' : 's'}`,
      color: 'bg-sky-400',
    },
    {
      label: 'Active tenants',
      value: summary.active,
      note: tenants.length
        ? `${Math.round((summary.active / tenants.length) * 100)}% of all tenants`
        : 'No tenants created yet',
      color: 'bg-emerald-400',
    },
    {
      label: 'Suspended tenants',
      value: summary.suspended,
      note: 'Access currently restricted',
      color: 'bg-amber-400',
    },
    {
      label: 'Inactive tenants',
      value: summary.inactive,
      note: 'No active dealership access',
      color: 'bg-zinc-500',
    },
  ]

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <PlatformShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
              System administration
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Platform dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-500">{today}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              to="/platform/tenants"
            >
              Manage tenants
            </Link>
            <Link
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              to="/platform/tenants/new"
            >
              + Create tenant
            </Link>
          </div>
        </header>

        {error ? (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-200" role="alert">
              {error}
            </p>
            <button
              className="rounded-lg bg-red-200 px-3 py-2 text-xs font-semibold text-red-950"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </div>
        ) : null}

        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Platform summary"
          aria-busy={isLoading}
        >
          {summaryCards.map((card) => (
            <article
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
              key={card.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-400">{card.label}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${card.color}`} />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {isLoading ? '—' : card.value}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {isLoading ? 'Loading current data…' : card.note}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.65fr)]">
          <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                  Tenant registry
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Recently created tenants
                </h2>
              </div>
              <Link
                className="text-sm font-medium text-zinc-400 transition hover:text-white"
                to="/platform/tenants"
              >
                View all
              </Link>
            </div>

            {isLoading ? (
              <p className="px-6 py-12 text-center text-sm text-zinc-500">
                Loading tenant registry…
              </p>
            ) : tenants.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-zinc-300">
                  No tenants have been created.
                </p>
                <Link
                  className="mt-3 inline-block text-sm font-semibold text-white underline underline-offset-4"
                  to="/platform/tenants/new"
                >
                  Create the first tenant
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-2xl border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900 text-[10px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                      <th className="px-6 py-3 font-semibold">Tenant</th>
                      <th className="px-4 py-3 font-semibold">Primary city</th>
                      <th className="px-4 py-3 font-semibold">Users</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {tenants.slice(0, 5).map((tenant) => (
                      <tr className="transition hover:bg-zinc-800/40" key={tenant.id}>
                        <td className="px-6 py-4">
                          <Link
                            className="text-sm font-medium text-zinc-200 hover:text-white"
                            to={`/platform/tenants/${tenant.id}`}
                          >
                            {tenant.name}
                          </Link>
                          <p className="mt-1 font-mono text-[11px] text-zinc-600">
                            {tenant.slug}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {tenant.primaryLocationCity ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {tenant.userCount}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-500">
                          {formatPlatformDate(tenant.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${tenantStatusClass(tenant.status)}`}
                          >
                            {tenant.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
              Live services
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Platform health
            </h2>
            <div className="mt-6 space-y-3">
              {[
                {
                  name: 'API',
                  operational: health.status === 'healthy',
                },
                {
                  name: 'Database',
                  operational: health.database === 'connected',
                },
                { name: 'Platform authentication', operational: true },
              ].map((service) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                  key={service.name}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${service.operational ? 'bg-emerald-400' : 'bg-red-400'}`}
                    />
                    <p className="text-sm font-medium text-white">{service.name}</p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {service.operational ? 'Operational' : 'Unavailable'}
                  </p>
                </div>
              ))}
            </div>

            <Link
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              to="/platform/tenants/new"
            >
              Start tenant provisioning
            </Link>
          </article>
        </section>
      </div>
    </PlatformShell>
  )
}
