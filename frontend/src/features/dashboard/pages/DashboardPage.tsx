import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/lib/api/api-client'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getTenantDashboard } from '../api/dashboard-api'
import type { TenantDashboard } from '../types/dashboard'

function metricStatusClass(status: string): string {
  if (
    ['AVAILABLE', 'ACTIVE', 'COMPLETED', 'SCHEDULED', 'IN_PROGRESS'].includes(
      status,
    )
  ) {
    return 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
  }

  if (['RESERVED', 'PENDING', 'SENT', 'ACCEPTED'].includes(status)) {
    return 'bg-amber-400/10 text-amber-300 ring-amber-400/20'
  }

  if (['CANCELLED', 'REJECTED', 'EXPIRED'].includes(status)) {
    return 'bg-red-400/10 text-red-300 ring-red-400/20'
  }

  return 'bg-zinc-800 text-zinc-400 ring-zinc-700'
}

function formatCurrency(
  value: string | number,
  currencyCode: string,
): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatDateTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value))
}

export function DashboardPage() {
  const { user, hasPermission } = useAuth()
  const [dashboard, setDashboard] = useState<TenantDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const dashboardData = await getTenantDashboard()
        if (isActive) {
          setDashboard(dashboardData)
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load the dealership dashboard.',
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

  const summaryCards = useMemo(() => {
    if (!dashboard) {
      return []
    }

    return [
      dashboard.metrics.inventoryAvailable === null
        ? null
        : {
            label: 'Available vehicles',
            value: dashboard.metrics.inventoryAvailable,
            note: `${dashboard.metrics.inventoryTotal ?? 0} total in inventory`,
            color: 'bg-sky-400',
            to: '/inventory',
          },
      dashboard.metrics.activeLeads === null
        ? null
        : {
            label: 'Active leads',
            value: dashboard.metrics.activeLeads,
            note: 'New, contacted, and qualified',
            color: 'bg-violet-400',
            to: '/leads',
          },
      dashboard.metrics.upcomingTestDrives === null
        ? null
        : {
            label: 'Upcoming test drives',
            value: dashboard.metrics.upcomingTestDrives,
            note: 'Scheduled or currently in progress',
            color: 'bg-emerald-400',
            to: '/test-drives',
          },
      dashboard.metrics.completedSalesThisMonth === null
        ? null
        : {
            label: 'Sales this month',
            value: dashboard.metrics.completedSalesThisMonth,
            note: 'Completed vehicle sales',
            color: 'bg-amber-400',
            to: '/sales',
          },
    ].filter((card): card is NonNullable<typeof card> => card !== null)
  }, [dashboard])

  const quickActions = [
    hasPermission('inventory.write')
      ? {
          title: 'Add vehicle',
          description: 'Register new inventory',
          to: '/inventory/new',
        }
      : null,
    hasPermission('crm.write')
      ? {
          title: 'Create lead',
          description: 'Start a customer opportunity',
          to: '/leads/new',
        }
      : null,
    hasPermission('sales.create_offer')
      ? {
          title: 'Create offer',
          description: 'Prepare customer pricing',
          to: '/offers/new',
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null)

  if (isLoading && !dashboard) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-4 w-36 rounded bg-zinc-800" />
          <div className="mt-4 h-9 w-72 rounded bg-zinc-800" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-36 rounded-2xl bg-zinc-900" key={item} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-white">Dashboard unavailable</h1>
        <p className="mt-3 text-sm text-zinc-500" role="alert">
          {error}
        </p>
        <button
          className="mt-6 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return null
  }

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: dashboard.dealership.timezone,
  }).format(new Date())

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-5 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            {dashboard.dealership.primaryLocation
              ? `${dashboard.dealership.primaryLocation.name} · ${dashboard.dealership.primaryLocation.city}`
              : 'Dealership workspace'}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Good to see you, {user?.firstName}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{today}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {quickActions.slice(0, 2).map((action, index) => (
            <Link
              className={
                index === quickActions.slice(0, 2).length - 1
                  ? 'rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200'
                  : 'rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white'
              }
              key={action.to}
              to={action.to}
            >
              {action.title}
            </Link>
          ))}
        </div>
      </header>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
          <p className="text-sm text-amber-200">{error}</p>
          <button
            className="text-xs font-semibold text-amber-100 underline underline-offset-4"
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Refresh
          </button>
        </div>
      ) : null}

      <section
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Dealership summary"
      >
        {summaryCards.map((card) => (
          <Link
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
            key={card.label}
            to={card.to}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-400">{card.label}</p>
              <span className={`h-2.5 w-2.5 rounded-full ${card.color}`} />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {card.value}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">{card.note}</p>
              <span className="text-xs text-zinc-700 transition group-hover:text-zinc-300">
                View →
              </span>
            </div>
          </Link>
        ))}
      </section>

      {quickActions.length > 0 ? (
        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Quick actions">
          {quickActions.map((action) => (
            <Link
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:bg-zinc-900"
              key={action.to}
              to={action.to}
            >
              <p className="text-sm font-semibold text-white">{action.title}</p>
              <p className="mt-1 text-xs text-zinc-600">{action.description}</p>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.65fr)]">
        {dashboard.access.inventory ? (
          <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                  Inventory
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Recently updated vehicles
                </h2>
              </div>
              <Link
                className="text-sm font-medium text-zinc-400 transition hover:text-white"
                to="/inventory"
              >
                View all
              </Link>
            </div>

            {dashboard.recentVehicles.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-medium text-zinc-300">
                  No vehicles are registered yet.
                </p>
                {hasPermission('inventory.write') ? (
                  <Link
                    className="mt-3 inline-block text-sm font-semibold text-white underline underline-offset-4"
                    to="/inventory/new"
                  >
                    Add the first vehicle
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-2xl border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                      <th className="px-6 py-3 font-semibold">Vehicle</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {dashboard.recentVehicles.map((vehicle) => (
                      <tr className="transition hover:bg-zinc-800/40" key={vehicle.id}>
                        <td className="px-6 py-4">
                          <Link
                            className="text-sm font-medium text-zinc-200 hover:text-white"
                            to={`/inventory/${vehicle.id}`}
                          >
                            {vehicle.modelYear} {vehicle.make} {vehicle.model}
                          </Link>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-zinc-500">
                          {vehicle.stockNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-zinc-400">
                          {vehicle.askingPrice
                            ? formatCurrency(
                                vehicle.askingPrice,
                                dashboard.dealership.currencyCode,
                              )
                            : 'Not priced'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${metricStatusClass(vehicle.status)}`}
                          >
                            {vehicle.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        ) : null}

        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
            Sales pipeline
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Current workload</h2>
          <div className="mt-6 space-y-3">
            {[
              dashboard.metrics.inventoryReserved === null
                ? null
                : {
                    label: 'Reserved vehicles',
                    value: dashboard.metrics.inventoryReserved,
                    to: '/inventory',
                  },
              dashboard.metrics.openOffers === null
                ? null
                : {
                    label: 'Open offers',
                    value: dashboard.metrics.openOffers,
                    to: '/offers',
                  },
              dashboard.metrics.activeReservations === null
                ? null
                : {
                    label: 'Active reservations',
                    value: dashboard.metrics.activeReservations,
                    to: '/reservations',
                  },
            ]
              .filter((item): item is NonNullable<typeof item> => item !== null)
              .map((item) => (
                <Link
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:bg-zinc-900"
                  key={item.label}
                  to={item.to}
                >
                  <p className="text-sm text-zinc-400">{item.label}</p>
                  <p className="text-lg font-semibold text-white">{item.value}</p>
                </Link>
              ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        {dashboard.access.crm ? (
          <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                  Schedule
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Upcoming test drives
                </h2>
              </div>
              <Link className="text-sm text-zinc-400 hover:text-white" to="/test-drives">
                View all
              </Link>
            </div>
            {dashboard.upcomingTestDrives.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-zinc-500">
                No upcoming test drives.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {dashboard.upcomingTestDrives.map((testDrive) => (
                  <Link
                    className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-zinc-800/40 sm:px-6"
                    key={testDrive.id}
                    to={`/test-drives/${testDrive.id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {testDrive.customerName}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {testDrive.vehicleName} · {testDrive.locationName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-zinc-300">
                        {formatDateTime(
                          testDrive.scheduledStart,
                          dashboard.dealership.timezone,
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-600">
                        {testDrive.salespersonName}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </article>
        ) : null}

        {dashboard.access.sales ? (
          <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                  Sales
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Recent transactions
                </h2>
              </div>
              <Link className="text-sm text-zinc-400 hover:text-white" to="/sales">
                View all
              </Link>
            </div>
            {dashboard.recentSales.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-zinc-500">
                No sales have been recorded.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {dashboard.recentSales.map((sale) => (
                  <Link
                    className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-zinc-800/40 sm:px-6"
                    key={sale.id}
                    to={`/sales/${sale.id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {sale.customerName}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {sale.vehicleName} · {sale.saleNumber}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(
                          sale.totalAmount,
                          dashboard.dealership.currencyCode,
                        )}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${metricStatusClass(sale.status)}`}
                      >
                        {sale.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </article>
        ) : null}
      </section>
    </div>
  )
}
