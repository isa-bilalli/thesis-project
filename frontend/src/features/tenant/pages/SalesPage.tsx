import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { listSales } from '../api/tenant-api'
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
import type { Pagination, Sale } from '../types/tenant-domain'

export function SalesPage() {
  const { user, hasPermission } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      listSales({ page: pagination.page, limit: 20, status })
        .then((data) => {
          if (active) {
            setSales(data.sales)
            setPagination(data.pagination)
          }
        })
        .catch((loadError) => active && setError(getErrorMessage(loadError, 'Unable to load sales.')))
        .finally(() => active && setIsLoading(false))
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [pagination.page, status])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales" title="Vehicle sales" description="Create, complete, and audit dealership sales." action={hasPermission('sales.complete') ? <Link className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black" to="/sales/new">+ Create sale</Link> : undefined} />
      <FeedbackMessage error={error} />
      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="border-b border-zinc-800 p-4"><select className={`${inputClassName.replace('mt-2 ', '')} max-w-xs`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option>PENDING</option><option>COMPLETED</option><option>CANCELLED</option></select></div>
        {isLoading ? <p className="p-14 text-center text-sm text-zinc-500">Loading sales…</p> : sales.length === 0 ? <EmptyState title="No sales found" description="Create a sale from an available or reserved vehicle." actionLabel={hasPermission('sales.complete') ? 'Create sale' : undefined} actionTo={hasPermission('sales.complete') ? '/sales/new' : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-5xl text-left"><thead><tr className="border-b border-zinc-800 text-[10px] tracking-wider text-zinc-600 uppercase"><th className="px-6 py-3">Sale</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{sales.map((sale) => <tr key={sale.id}><td className="px-6 py-4 text-sm font-medium text-white">{sale.saleNumber}<p className="mt-1 text-xs text-zinc-600">{sale.location.code}</p></td><td className="px-4 py-4 text-sm text-zinc-400">{referenceCustomerName(sale.customer)}</td><td className="px-4 py-4 text-sm text-zinc-400">{sale.vehicle.modelYear} {sale.vehicle.make} {sale.vehicle.model}<p className="mt-1 text-xs text-zinc-600">{sale.vehicle.stockNumber}</p></td><td className="px-4 py-4 text-xs text-zinc-500">{formatDate(sale.saleDate)}</td><td className="px-4 py-4 text-sm font-medium text-zinc-200">{formatCurrency(sale.totalAmount, user?.tenant.currencyCode)}</td><td className="px-4 py-4"><StatusBadge status={sale.status} /></td><td className="px-6 py-4 text-right"><Link className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300" to={`/sales/${sale.id}`}>Manage</Link></td></tr>)}</tbody></table></div>}
        <PaginationControls pagination={pagination} onPage={(page) => setPagination((current) => ({ ...current, page }))} />
      </section>
    </div>
  )
}
