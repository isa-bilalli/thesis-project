import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cancelVehicleReservation, getReservation, updateReservation } from '../api/tenant-api'
import { FeedbackMessage, PageHeader, StatusBadge, formatCurrency, formatDate, getErrorMessage, inputClassName, referenceCustomerName } from '../components/TenantPage'
import type { Reservation } from '../types/tenant-domain'

function toLocalDateTime(value: string): string {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function ReservationDetailPage() {
  const { reservationId } = useParams()
  const id = Number(reservationId)
  const { user, hasPermission } = useAuth()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [form, setForm] = useState({ agreedPrice: '', expiresAt: '', notes: '' })
  const [cancellationReason, setCancellationReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getReservation(id)
      setReservation(data)
      setForm({ agreedPrice: data.agreedPrice ?? '', expiresAt: toLocalDateTime(data.expiresAt), notes: data.notes ?? '' })
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load reservation.'))
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await updateReservation(id, { agreedPrice: form.agreedPrice || null, expiresAt: new Date(form.expiresAt).toISOString(), notes: form.notes || null })
      setSuccess('Reservation updated.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update reservation.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function cancel() {
    if (!reservation) return
    setIsSaving(true)
    setError(null)
    try {
      await cancelVehicleReservation(reservation.vehicle.id, cancellationReason || null)
      setSuccess('Reservation cancelled and vehicle released.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to cancel reservation.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p className="p-12 text-sm text-zinc-500">Loading reservation…</p>
  if (!reservation) return <div className="p-8"><FeedbackMessage error={error ?? 'Reservation not found.'} /></div>
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales / Reservation" title={reservation.reservationNumber} description={`${referenceCustomerName(reservation.customer)} · ${reservation.vehicle.modelYear} ${reservation.vehicle.make} ${reservation.vehicle.model}`} action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/reservations">Back to reservations</Link>} />
      <FeedbackMessage error={error} success={success} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Reservation summary</h2><StatusBadge status={reservation.status} /></div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-zinc-600">Reserved at</dt><dd className="mt-1 text-zinc-300">{formatDate(reservation.reservedAt, true)}</dd></div><div><dt className="text-zinc-600">Expires</dt><dd className="mt-1 text-zinc-300">{formatDate(reservation.expiresAt, true)}</dd></div><div><dt className="text-zinc-600">Agreed price</dt><dd className="mt-1 text-zinc-300">{formatCurrency(reservation.agreedPrice, user?.tenant.currencyCode)}</dd></div><div><dt className="text-zinc-600">Salesperson</dt><dd className="mt-1 text-zinc-300">{reservation.salesperson.firstName} {reservation.salesperson.lastName}</dd></div></dl>
          {reservation.notes ? <p className="mt-6 border-t border-zinc-800 pt-5 text-sm text-zinc-400">{reservation.notes}</p> : null}
          {reservation.cancellationReason ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{reservation.cancellationReason}</p> : null}
        </section>
        {hasPermission('inventory.reserve') && reservation.status === 'ACTIVE' ? <aside className="space-y-5"><form className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" onSubmit={save}><h2 className="text-sm font-semibold text-white">Edit reservation</h2><label className="mt-4 block text-xs text-zinc-500">Agreed price<input className={inputClassName} type="number" min="0" step="0.01" value={form.agreedPrice} onChange={(event) => setForm((current) => ({ ...current, agreedPrice: event.target.value }))} /></label><label className="mt-4 block text-xs text-zinc-500">Expires at<input className={inputClassName} type="datetime-local" required value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} /></label><label className="mt-4 block text-xs text-zinc-500">Notes<textarea className={`${inputClassName} min-h-20`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label><button className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving}>Save changes</button></form><div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5"><h2 className="text-sm font-semibold text-red-200">Cancel reservation</h2><textarea className={`${inputClassName} min-h-20`} placeholder="Cancellation reason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} /><button className="mt-3 w-full rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-50" type="button" disabled={isSaving || !cancellationReason.trim()} onClick={() => void cancel()}>Cancel and release vehicle</button></div></aside> : null}
      </div>
    </div>
  )
}
