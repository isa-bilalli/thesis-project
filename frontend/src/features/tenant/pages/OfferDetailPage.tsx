import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getOffer, updateOfferStatus } from '../api/tenant-api'
import { FeedbackMessage, PageHeader, StatusBadge, formatCurrency, formatDate, getErrorMessage, inputClassName, referenceCustomerName } from '../components/TenantPage'
import type { Offer } from '../types/tenant-domain'

export function OfferDetailPage() {
  const { offerId } = useParams()
  const id = Number(offerId)
  const { user, hasPermission } = useAuth()
  const [offer, setOffer] = useState<Offer | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getOffer(id)
      setOffer(data)
      setStatus(data.status)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load offer.'))
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
      await updateOfferStatus(id, status)
      setSuccess('Offer status updated.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update offer.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p className="p-12 text-sm text-zinc-500">Loading offer…</p>
  if (!offer) return <div className="p-8"><FeedbackMessage error={error ?? 'Offer not found.'} /></div>
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales / Offer" title={offer.offerNumber} description={`${referenceCustomerName(offer.customer)} · ${offer.vehicle.modelYear} ${offer.vehicle.make} ${offer.vehicle.model}`} action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/offers">Back to offers</Link>} />
      <FeedbackMessage error={error} success={success} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Offer summary</h2><StatusBadge status={offer.status} /></div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-zinc-600">Customer</dt><dd className="mt-1 text-zinc-300">{referenceCustomerName(offer.customer)}</dd></div><div><dt className="text-zinc-600">Salesperson</dt><dd className="mt-1 text-zinc-300">{offer.salesperson.firstName} {offer.salesperson.lastName}</dd></div><div><dt className="text-zinc-600">Location</dt><dd className="mt-1 text-zinc-300">{offer.location.name}</dd></div><div><dt className="text-zinc-600">Valid until</dt><dd className="mt-1 text-zinc-300">{formatDate(offer.validUntil, true)}</dd></div></dl>
          <div className="mt-6 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm sm:grid-cols-2"><p className="text-zinc-500">Vehicle price <span className="float-right text-zinc-200">{formatCurrency(offer.vehiclePrice, user?.tenant.currencyCode)}</span></p><p className="text-zinc-500">Discount <span className="float-right text-zinc-200">{formatCurrency(offer.discountAmount, user?.tenant.currencyCode)}</span></p><p className="text-zinc-500">Tax <span className="float-right text-zinc-200">{formatCurrency(offer.taxAmount, user?.tenant.currencyCode)}</span></p><p className="text-zinc-500">Fees <span className="float-right text-zinc-200">{formatCurrency(offer.feeAmount, user?.tenant.currencyCode)}</span></p><p className="border-t border-zinc-800 pt-3 font-semibold text-white sm:col-span-2">Total <span className="float-right">{formatCurrency(offer.totalAmount, user?.tenant.currencyCode)}</span></p></div>
          {offer.notes ? <p className="mt-5 text-sm leading-6 text-zinc-400">{offer.notes}</p> : null}
        </section>
        {hasPermission('sales.create_offer') ? <form className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" onSubmit={submit}><h2 className="text-sm font-semibold text-white">Update status</h2><select className={inputClassName} value={status} onChange={(event) => setStatus(event.target.value)}>{['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select><button className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || status === offer.status}>{isSaving ? 'Saving…' : 'Save status'}</button><p className="mt-3 text-xs leading-5 text-zinc-600">The backend enforces valid status transitions and expiration rules.</p></form> : null}
      </div>
    </div>
  )
}
