import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createOffer,
  listCustomers,
  listLeads,
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
import type { Customer, Lead, TenantLocation, VehicleListItem } from '../types/tenant-domain'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function CreateOfferPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [form, setForm] = useState({ locationId: '', leadId: '', customerId: '', vehicleId: '', vehiclePrice: '', discountAmount: '0', taxAmount: '0', feeAmount: '0', validUntil: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([listCustomers({ limit: 100 }), listLeads({ limit: 100 }), listTenantLocations(), listVehicles({ status: 'AVAILABLE', limit: 100 })])
      .then(([customerData, leadData, locationData, vehicleData]) => {
        const activeCustomers = customerData.customers.filter((item) => item.status !== 'INACTIVE')
        const activeLeads = leadData.leads.filter((item) => !['WON', 'LOST'].includes(item.status))
        setCustomers(activeCustomers)
        setLeads(activeLeads)
        setLocations(locationData)
        setVehicles(vehicleData.vehicles)
        setForm((current) => ({ ...current, customerId: String(activeCustomers[0]?.id ?? ''), locationId: String(locationData.find((item) => item.isPrimary)?.id ?? locationData[0]?.id ?? ''), vehicleId: String(vehicleData.vehicles[0]?.id ?? ''), vehiclePrice: vehicleData.vehicles[0]?.askingPrice ?? '' }))
      })
      .catch((loadError) => setError(getErrorMessage(loadError, 'Unable to load offer options.')))
  }, [])

  const total = useMemo(() => Number(form.vehiclePrice || 0) - Number(form.discountAmount || 0) + Number(form.taxAmount || 0) + Number(form.feeAmount || 0), [form.discountAmount, form.feeAmount, form.taxAmount, form.vehiclePrice])

  function selectVehicle(value: string) {
    const vehicle = vehicles.find((item) => item.id === Number(value))
    setForm((current) => ({ ...current, vehicleId: value, vehiclePrice: vehicle?.askingPrice ?? current.vehiclePrice }))
  }

  function selectLead(value: string) {
    const lead = leads.find((item) => item.id === Number(value))
    setForm((current) => ({ ...current, leadId: value, customerId: lead ? String(lead.customer.id) : current.customerId, locationId: lead ? String(lead.location.id) : current.locationId }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const offer = await createOffer({
        locationId: Number(form.locationId),
        leadId: form.leadId ? Number(form.leadId) : null,
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        vehiclePrice: form.vehiclePrice,
        discountAmount: form.discountAmount || '0',
        taxAmount: form.taxAmount || '0',
        feeAmount: form.feeAmount || '0',
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        notes: form.notes || null,
      })
      navigate(`/offers/${offer.id}`, { replace: true })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to create offer.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Sales" title="Create offer" description="Price an available vehicle and prepare a customer-ready offer." action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/offers">Cancel</Link>} />
      <FeedbackMessage error={error} />
      <form className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-400">Related lead (optional)<select className={inputClassName} value={form.leadId} onChange={(event) => selectLead(event.target.value)}><option value="">No related lead</option>{leads.map((item) => <option key={item.id} value={item.id}>#{item.id} · {referenceCustomerName(item.customer)}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Customer<select className={inputClassName} required value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value, leadId: '' }))}>{customers.map((item) => <option key={item.id} value={item.id}>{customerName(item)}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Vehicle<select className={inputClassName} required value={form.vehicleId} onChange={(event) => selectVehicle(event.target.value)}>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.modelYear} {item.make} {item.model} · {item.stockNumber}</option>)}</select></label>
          <label className="text-sm text-zinc-400">Location<select className={inputClassName} required value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>{locations.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {(['vehiclePrice', 'discountAmount', 'taxAmount', 'feeAmount'] as const).map((field) => <label className="text-sm text-zinc-400" key={field}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}<input className={inputClassName} type="number" min="0" step="0.01" required={field === 'vehiclePrice'} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} /></label>)}
          <label className="text-sm text-zinc-400">Valid until<input className={inputClassName} type="datetime-local" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} /></label>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs text-zinc-600">Calculated total</p><p className="mt-2 text-xl font-semibold text-white">{formatCurrency(total, user?.tenant.currencyCode)}</p></div>
          <label className="text-sm text-zinc-400 sm:col-span-2">Notes<textarea className={`${inputClassName} min-h-28`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        </div>
        <button className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || !form.customerId || !form.vehicleId || !form.locationId}>{isSaving ? 'Creating…' : 'Create draft offer'}</button>
      </form>
    </div>
  )
}
