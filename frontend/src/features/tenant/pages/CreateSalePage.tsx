import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  createSale,
  listCustomers,
  listOffers,
  listReservations,
  listTenantLocations,
  listVehicles,
} from '../api/tenant-api'
import {
  FeedbackMessage,
  PageHeader,
  customerName,
  formatCurrency,
  getErrorMessage,
  inputClassName,
  referenceCustomerName,
} from '../components/TenantPage'
import type { Customer, Offer, Reservation, TenantLocation, VehicleListItem } from '../types/tenant-domain'

function currentLocalDateTime(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function CreateSalePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [form, setForm] = useState({ locationId: '', customerId: '', vehicleId: '', leadId: '', offerId: '', reservationId: '', saleDate: currentLocalDateTime(), vehiclePrice: '', discountAmount: '0', taxAmount: '0', feeAmount: '0', paymentMethod: 'BANK_TRANSFER', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      listCustomers({ limit: 100 }),
      listTenantLocations(),
      listVehicles({ status: 'AVAILABLE', limit: 100 }),
      listVehicles({ status: 'RESERVED', limit: 100 }),
      listOffers({ status: 'ACCEPTED', limit: 100 }),
      listReservations({ status: 'ACTIVE', limit: 100 }),
    ]).then(([customerData, locationData, availableData, reservedData, offerData, reservationData]) => {
      const activeCustomers = customerData.customers.filter((item) => item.status !== 'INACTIVE')
      const saleVehicles = [...availableData.vehicles, ...reservedData.vehicles]
      setCustomers(activeCustomers)
      setLocations(locationData)
      setVehicles(saleVehicles)
      setOffers(offerData.offers)
      setReservations(reservationData.reservations)
      const firstVehicle = saleVehicles[0]
      setForm((current) => ({ ...current, customerId: String(activeCustomers[0]?.id ?? ''), vehicleId: String(firstVehicle?.id ?? ''), locationId: String(firstVehicle?.location.id ?? locationData.find((item) => item.isPrimary)?.id ?? locationData[0]?.id ?? ''), vehiclePrice: firstVehicle?.askingPrice ?? '' }))
    }).catch((loadError) => setError(getErrorMessage(loadError, 'Unable to load sale options.')))
  }, [])

  const total = useMemo(() => Number(form.vehiclePrice || 0) - Number(form.discountAmount || 0) + Number(form.taxAmount || 0) + Number(form.feeAmount || 0), [form.discountAmount, form.feeAmount, form.taxAmount, form.vehiclePrice])

  function selectVehicle(value: string) {
    const vehicle = vehicles.find((item) => item.id === Number(value))
    setForm((current) => ({ ...current, vehicleId: value, locationId: vehicle ? String(vehicle.location.id) : current.locationId, vehiclePrice: vehicle?.askingPrice ?? current.vehiclePrice, offerId: '', reservationId: '', leadId: '' }))
  }

  function selectOffer(value: string) {
    const offer = offers.find((item) => item.id === Number(value))
    if (!offer) {
      setForm((current) => ({ ...current, offerId: '', leadId: '' }))
      return
    }
    setForm((current) => ({ ...current, offerId: value, customerId: String(offer.customer.id), vehicleId: String(offer.vehicle.id), locationId: String(offer.location.id), leadId: String(offer.lead?.id ?? ''), vehiclePrice: offer.vehiclePrice, discountAmount: offer.discountAmount, taxAmount: offer.taxAmount, feeAmount: offer.feeAmount }))
  }

  function selectReservation(value: string) {
    const reservation = reservations.find((item) => item.id === Number(value))
    if (!reservation) {
      setForm((current) => ({ ...current, reservationId: '' }))
      return
    }
    const vehicle = vehicles.find((item) => item.id === reservation.vehicle.id)
    setForm((current) => ({ ...current, reservationId: value, customerId: String(reservation.customer.id), vehicleId: String(reservation.vehicle.id), locationId: vehicle ? String(vehicle.location.id) : current.locationId, leadId: String(reservation.lead?.id ?? ''), offerId: String(reservation.offer?.id ?? ''), vehiclePrice: reservation.agreedPrice ?? vehicle?.askingPrice ?? current.vehiclePrice }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const sale = await createSale({
        locationId: Number(form.locationId),
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        leadId: form.leadId ? Number(form.leadId) : null,
        offerId: form.offerId ? Number(form.offerId) : null,
        reservationId: form.reservationId ? Number(form.reservationId) : null,
        saleDate: new Date(form.saleDate).toISOString(),
        vehiclePrice: form.vehiclePrice,
        discountAmount: form.discountAmount || '0',
        taxAmount: form.taxAmount || '0',
        feeAmount: form.feeAmount || '0',
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
      })
      navigate(`/sales/${sale.id}`, { replace: true })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to create sale.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales" title="Create sale" description="Create a pending sale from an available vehicle, accepted offer, or active reservation." action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/sales">Cancel</Link>} />
      <FeedbackMessage error={error} />
      <form className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-400">Accepted offer (optional)<select className={inputClassName} value={form.offerId} onChange={(event) => selectOffer(event.target.value)}><option value="">No accepted offer</option>{offers.map((item) => <option key={item.id} value={item.id}>{item.offerNumber} · {referenceCustomerName(item.customer)}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Active reservation (optional)<select className={inputClassName} value={form.reservationId} onChange={(event) => selectReservation(event.target.value)}><option value="">No active reservation</option>{reservations.map((item) => <option key={item.id} value={item.id}>{item.reservationNumber} · {referenceCustomerName(item.customer)}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Customer<select className={inputClassName} required value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value, offerId: '', reservationId: '', leadId: '' }))}>{customers.map((item) => <option key={item.id} value={item.id}>{customerName(item)}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Vehicle<select className={inputClassName} required value={form.vehicleId} onChange={(event) => selectVehicle(event.target.value)}>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.modelYear} {item.make} {item.model} · {item.stockNumber} ({item.status})</option>)}</select></label>
          <label className="text-sm text-zinc-400">Location<select className={inputClassName} required value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>{locations.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Sale date<input className={inputClassName} type="datetime-local" required value={form.saleDate} onChange={(event) => setForm((current) => ({ ...current, saleDate: event.target.value }))} /></label>
          {(['vehiclePrice', 'discountAmount', 'taxAmount', 'feeAmount'] as const).map((field) => <label className="text-sm text-zinc-400" key={field}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}<input className={inputClassName} type="number" min="0" step="0.01" required={field === 'vehiclePrice'} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
          <label className="text-sm text-zinc-400">Payment method<select className={inputClassName} value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}>{['CASH', 'BANK_TRANSFER', 'EXTERNAL_FINANCING', 'OTHER'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs text-zinc-600">Calculated total</p><p className="mt-2 text-xl font-semibold text-white">{formatCurrency(total, user?.tenant.currencyCode)}</p></div>
          <label className="text-sm text-zinc-400 sm:col-span-2">Notes<textarea className={`${inputClassName} min-h-28`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        </div>
        <button className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || !form.customerId || !form.vehicleId || !form.locationId}>{isSaving ? 'Creating…' : 'Create pending sale'}</button>
      </form>
    </div>
  )
}
