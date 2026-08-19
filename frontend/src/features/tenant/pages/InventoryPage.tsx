import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { listVehicles } from '../api/tenant-api'
import { EmptyState, FeedbackMessage, PageHeader, PaginationControls, StatusBadge, formatCurrency, getErrorMessage, inputClassName } from '../components/TenantPage'
import type { Pagination, VehicleListItem } from '../types/tenant-domain'

export function InventoryPage() {
  const { user, hasPermission } = useAuth()
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [condition, setCondition] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      listVehicles({ page: pagination.page, limit: pagination.limit, search, status, condition })
        .then((data) => { if (active) { setVehicles(data.vehicles); setPagination(data.pagination) } })
        .catch((loadError) => { if (active) setError(getErrorMessage(loadError, 'Unable to load inventory.')) })
        .finally(() => { if (active) setIsLoading(false) })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [condition, pagination.limit, pagination.page, search, status])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Inventory" title="Vehicle inventory" description="Search and manage every vehicle across dealership locations." action={hasPermission('inventory.write') ? <Link className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black" to="/inventory/new">+ Add vehicle</Link> : undefined} />
      <FeedbackMessage error={error} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-[1fr_11rem_11rem]">
          <input className={inputClassName.replace('mt-2 ', '')} type="search" placeholder="Search stock, VIN, make, or model" value={search} onChange={(event) => { setSearch(event.target.value); setPagination((current) => ({ ...current, page: 1 })) }} />
          <select className={inputClassName.replace('mt-2 ', '')} value={status} onChange={(event) => { setStatus(event.target.value); setPagination((current) => ({ ...current, page: 1 })) }}><option value="">All statuses</option>{['DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED'].map((value) => <option key={value}>{value}</option>)}</select>
          <select className={inputClassName.replace('mt-2 ', '')} value={condition} onChange={(event) => { setCondition(event.target.value); setPagination((current) => ({ ...current, page: 1 })) }}><option value="">All conditions</option><option>NEW</option><option>USED</option></select>
        </div>
        {isLoading ? <p className="px-6 py-14 text-center text-sm text-zinc-500">Loading inventory…</p> : vehicles.length === 0 ? <EmptyState title="No vehicles found" description="Add inventory or adjust the current filters." actionLabel={hasPermission('inventory.write') ? 'Add vehicle' : undefined} actionTo={hasPermission('inventory.write') ? '/inventory/new' : undefined} /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-5xl text-left"><thead><tr className="border-b border-zinc-800 text-[10px] tracking-wider text-zinc-600 uppercase"><th className="px-6 py-3">Vehicle</th><th className="px-4 py-3">Stock / VIN</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Mileage</th><th className="px-4 py-3">Asking price</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{vehicles.map((vehicle) => <tr key={vehicle.id} className="hover:bg-zinc-800/30"><td className="px-6 py-4"><p className="text-sm font-medium text-white">{vehicle.modelYear} {vehicle.make} {vehicle.model}</p><p className="mt-1 text-xs text-zinc-600">{vehicle.condition}{vehicle.trimLevel ? ` · ${vehicle.trimLevel}` : ''}</p></td><td className="px-4 py-4"><p className="font-mono text-xs text-zinc-400">{vehicle.stockNumber}</p><p className="mt-1 font-mono text-[10px] text-zinc-600">{vehicle.vin ?? 'No VIN'}</p></td><td className="px-4 py-4 text-sm text-zinc-400">{vehicle.location.name}</td><td className="px-4 py-4 text-sm text-zinc-400">{vehicle.mileageKm.toLocaleString()} km</td><td className="px-4 py-4 text-sm text-zinc-300">{formatCurrency(vehicle.askingPrice, user?.tenant.currencyCode)}</td><td className="px-4 py-4"><StatusBadge status={vehicle.status} /></td><td className="px-6 py-4 text-right"><Link className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300" to={`/inventory/${vehicle.id}`}>Manage</Link></td></tr>)}</tbody></table></div>
        )}
        <PaginationControls pagination={pagination} onPage={(page) => setPagination((current) => ({ ...current, page }))} />
      </section>
    </div>
  )
}
