import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getSale, updateSaleStatus } from '../api/tenant-api'
import { FeedbackMessage, PageHeader, StatusBadge, formatCurrency, formatDate, getErrorMessage, inputClassName, referenceCustomerName } from '../components/TenantPage'
import type { Sale } from '../types/tenant-domain'

export function SaleDetailPage() {
  const { saleId } = useParams()
  const id = Number(saleId)
  const { user, hasPermission } = useAuth()
  const [sale, setSale] = useState<Sale | null>(null)
  const [status, setStatus] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getSale(id)
      setSale(data)
      setStatus(data.status)
      setCancellationReason(data.cancellationReason ?? '')
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load sale.'))
    } finally {
      setIsLoading(false)
    }
  }, [id])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await updateSaleStatus(id, status, status === 'CANCELLED' ? cancellationReason : null)
      setSuccess(status === 'COMPLETED' ? 'Sale completed and vehicle marked sold.' : 'Sale status updated.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update sale.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p className="p-12 text-sm text-zinc-500">Loading sale…</p>
  if (!sale) return <div className="p-8"><FeedbackMessage error={error ?? 'Sale not found.'} /></div>
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales / Vehicle sale" title={sale.saleNumber} description={`${referenceCustomerName(sale.customer)} · ${sale.vehicle.modelYear} ${sale.vehicle.make} ${sale.vehicle.model}`} action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/sales">Back to sales</Link>} />
      <FeedbackMessage error={error} success={success} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Sale summary</h2><StatusBadge status={sale.status} /></div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-zinc-600">Sale date</dt><dd className="mt-1 text-zinc-300">{formatDate(sale.saleDate, true)}</dd></div><div><dt className="text-zinc-600">Salesperson</dt><dd className="mt-1 text-zinc-300">{sale.salesperson.firstName} {sale.salesperson.lastName}</dd></div><div><dt className="text-zinc-600">Location</dt><dd className="mt-1 text-zinc-300">{sale.location.name}</dd></div><div><dt className="text-zinc-600">Payment</dt><dd className="mt-1 text-zinc-300">{sale.paymentMethod?.replaceAll('_', ' ') ?? '—'}</dd></div></dl>
          <div className="mt-6 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm sm:grid-cols-2"><p className="text-zinc-500">Vehicle price <span className="float-right text-zinc-200">{formatCurrency(sale.vehiclePrice, user?.tenant.currencyCode)}</span></p><p className="text-zinc-500">Discount <span className="float-right text-zinc-200">{formatCurrency(sale.discountAmount, user?.tenant.currencyCode)}</span></p><p className="text-zinc-500">Tax <span className="float-right text-zinc-200">{formatCurrency(sale.taxAmount, user?.tenant.currencyCode)}</span></p><p className="text-zinc-500">Fees <span className="float-right text-zinc-200">{formatCurrency(sale.feeAmount, user?.tenant.currencyCode)}</span></p><p className="border-t border-zinc-800 pt-3 font-semibold text-white sm:col-span-2">Total <span className="float-right">{formatCurrency(sale.totalAmount, user?.tenant.currencyCode)}</span></p></div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">{sale.offer ? <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" to={`/offers/${sale.offer.id}`}>Offer {sale.offer.offerNumber}</Link> : null}{sale.reservation ? <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" to={`/reservations/${sale.reservation.id}`}>Reservation {sale.reservation.reservationNumber}</Link> : null}{sale.lead ? <Link className="rounded-lg border border-zinc-800 px-3 py-2 hover:text-white" to={`/leads/${sale.lead.id}`}>Lead #{sale.lead.id}</Link> : null}</div>
          {sale.cancellationReason ? <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{sale.cancellationReason}</p> : null}
        </section>
        {hasPermission('sales.complete') && sale.status === 'PENDING' ? <form className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" onSubmit={submit}><h2 className="text-sm font-semibold text-white">Finalize sale</h2><select className={inputClassName} value={status} onChange={(event) => setStatus(event.target.value)}><option>PENDING</option><option>COMPLETED</option><option>CANCELLED</option></select>{status === 'CANCELLED' ? <textarea className={`${inputClassName} min-h-24`} required placeholder="Cancellation reason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} /> : null}<button className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || status === sale.status}>{isSaving ? 'Saving…' : status === 'COMPLETED' ? 'Complete sale' : 'Save status'}</button><p className="mt-3 text-xs leading-5 text-zinc-600">Completing the sale also updates the linked vehicle and reservation in the backend transaction.</p></form> : null}
      </div>
    </div>
  )
}
