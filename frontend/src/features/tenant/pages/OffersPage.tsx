import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { listOffers } from '../api/tenant-api'
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
import type { Offer, Pagination } from '../types/tenant-domain'

export function OffersPage() {
  const { user, hasPermission } = useAuth()
  const [offers, setOffers] = useState<Offer[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      listOffers({ page: pagination.page, limit: 20, status })
        .then((data) => {
          if (active) {
            setOffers(data.offers)
            setPagination(data.pagination)
          }
        })
        .catch((loadError) => active && setError(getErrorMessage(loadError, 'Unable to load offers.')))
        .finally(() => active && setIsLoading(false))
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [pagination.page, status])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales" title="Offers" description="Prepare, send, and track customer vehicle offers." action={hasPermission('sales.create_offer') ? <Link className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black" to="/offers/new">+ Create offer</Link> : undefined} />
      <FeedbackMessage error={error} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="border-b border-zinc-800 p-4"><select className={`${inputClassName.replace('mt-2 ', '')} max-w-xs`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select></div>
        {isLoading ? <p className="p-14 text-center text-sm text-zinc-500">Loading offers…</p> : offers.length === 0 ? <EmptyState title="No offers found" description="Create the first offer or adjust the status filter." actionLabel={hasPermission('sales.create_offer') ? 'Create offer' : undefined} actionTo={hasPermission('sales.create_offer') ? '/offers/new' : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-5xl text-left"><thead><tr className="border-b border-zinc-800 text-[10px] tracking-wider text-zinc-600 uppercase"><th className="px-6 py-3">Offer</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Valid until</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{offers.map((offer) => <tr key={offer.id}><td className="px-6 py-4 text-sm font-medium text-white">{offer.offerNumber}<p className="mt-1 text-xs text-zinc-600">{offer.location.code}</p></td><td className="px-4 py-4 text-sm text-zinc-400">{referenceCustomerName(offer.customer)}</td><td className="px-4 py-4 text-sm text-zinc-400">{offer.vehicle.modelYear} {offer.vehicle.make} {offer.vehicle.model}<p className="mt-1 text-xs text-zinc-600">{offer.vehicle.stockNumber}</p></td><td className="px-4 py-4 text-sm font-medium text-zinc-200">{formatCurrency(offer.totalAmount, user?.tenant.currencyCode)}</td><td className="px-4 py-4 text-xs text-zinc-500">{formatDate(offer.validUntil)}</td><td className="px-4 py-4"><StatusBadge status={offer.status} /></td><td className="px-6 py-4 text-right"><Link className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300" to={`/offers/${offer.id}`}>Manage</Link></td></tr>)}</tbody></table></div>}
        <PaginationControls pagination={pagination} onPage={(page) => setPagination((current) => ({ ...current, page }))} />
      </section>
    </div>
  )
}
