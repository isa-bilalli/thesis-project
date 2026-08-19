import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listReservations } from '../api/tenant-api'
import {
  EmptyState,
  FeedbackMessage,
  PageHeader,
  PaginationControls,
  StatusBadge,
  formatCurrency,
  formatDate,
  getErrorMessage,
  inputClassName,
  referenceCustomerName,
} from '../components/TenantPage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Pagination, Reservation } from '../types/tenant-domain'

export function ReservationsPage() {
  const { user } = useAuth()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      listReservations({ page: pagination.page, limit: 20, status })
        .then((data) => {
          if (active) {
            setReservations(data.reservations)
            setPagination(data.pagination)
          }
        })
        .catch((loadError) => active && setError(getErrorMessage(loadError, 'Unable to load reservations.')))
        .finally(() => active && setIsLoading(false))
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [pagination.page, status])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales" title="Reservations" description="Monitor held vehicles, expiration dates, cancellations, and conversions." />
      <FeedbackMessage error={error} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="border-b border-zinc-800 p-4"><select className={`${inputClassName.replace('mt-2 ', '')} max-w-xs`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['ACTIVE', 'EXPIRED', 'CANCELLED', 'CONVERTED'].map((value) => <option key={value}>{value}</option>)}</select></div>
        {isLoading ? <p className="p-14 text-center text-sm text-zinc-500">Loading reservations…</p> : reservations.length === 0 ? <EmptyState title="No reservations found" description="Reserve an available vehicle from its inventory detail page." actionLabel="Open inventory" actionTo="/inventory" /> : <div className="overflow-x-auto"><table className="w-full min-w-5xl text-left"><thead><tr className="border-b border-zinc-800 text-[10px] tracking-wider text-zinc-600 uppercase"><th className="px-6 py-3">Reservation</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Agreed price</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{reservations.map((item) => <tr key={item.id}><td className="px-6 py-4 text-sm font-medium text-white">{item.reservationNumber}</td><td className="px-4 py-4 text-sm text-zinc-400">{referenceCustomerName(item.customer)}</td><td className="px-4 py-4 text-sm text-zinc-400">{item.vehicle.modelYear} {item.vehicle.make} {item.vehicle.model}<p className="mt-1 text-xs text-zinc-600">{item.vehicle.stockNumber}</p></td><td className="px-4 py-4 text-sm text-zinc-300">{formatCurrency(item.agreedPrice, user?.tenant.currencyCode)}</td><td className="px-4 py-4 text-xs text-zinc-500">{formatDate(item.expiresAt, true)}</td><td className="px-4 py-4"><StatusBadge status={item.status} /></td><td className="px-6 py-4 text-right"><Link className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300" to={`/reservations/${item.id}`}>Manage</Link></td></tr>)}</tbody></table></div>}
        <PaginationControls pagination={pagination} onPage={(page) => setPagination((current) => ({ ...current, page }))} />
      </section>
    </div>
  )
}
