import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  createTestDrive,
  listCustomers,
  listLeads,
  listTenantLocations,
  listTestDrives,
  listVehicles,
} from '../api/tenant-api'
import {
  EmptyState,
  FeedbackMessage,
  PageHeader,
  PaginationControls,
  StatusBadge,
  customerName,
  formatDate,
  getErrorMessage,
  inputClassName,
  referenceCustomerName,
} from '../components/TenantPage'
import type {
  Customer,
  Lead,
  Pagination,
  TenantLocation,
  TestDrive,
  VehicleListItem,
} from '../types/tenant-domain'

export function TestDrivesPage() {
  const { hasPermission } = useAuth()
  const [testDrives, setTestDrives] = useState<TestDrive[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [customers, setCustomers] = useState<Customer[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ locationId: '', leadId: '', customerId: '', vehicleId: '', scheduledStart: '', scheduledEnd: '', notes: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      listTestDrives({ page: pagination.page, limit: 20, status })
        .then((data) => {
          if (active) {
            setTestDrives(data.testDrives)
            setPagination(data.pagination)
          }
        })
        .catch((loadError) => active && setError(getErrorMessage(loadError, 'Unable to load test drives.')))
        .finally(() => active && setIsLoading(false))
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [pagination.page, reloadKey, status])

  useEffect(() => {
    if (!showForm) return
    Promise.all([
      listCustomers({ limit: 100 }),
      listLeads({ limit: 100 }),
      listVehicles({ status: 'AVAILABLE', limit: 100 }),
      listTenantLocations(),
    ]).then(([customerData, leadData, vehicleData, locationData]) => {
      const activeCustomers = customerData.customers.filter((item) => item.status !== 'INACTIVE')
      setCustomers(activeCustomers)
      setLeads(leadData.leads.filter((item) => !['WON', 'LOST'].includes(item.status)))
      setVehicles(vehicleData.vehicles)
      setLocations(locationData)
      setForm((current) => ({ ...current, customerId: current.customerId || String(activeCustomers[0]?.id ?? ''), vehicleId: current.vehicleId || String(vehicleData.vehicles[0]?.id ?? ''), locationId: current.locationId || String(locationData.find((item) => item.isPrimary)?.id ?? locationData[0]?.id ?? '') }))
    }).catch((loadError) => setError(getErrorMessage(loadError, 'Unable to load scheduling options.')))
  }, [showForm])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await createTestDrive({
        locationId: Number(form.locationId),
        leadId: form.leadId ? Number(form.leadId) : null,
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
        notes: form.notes || null,
      })
      setShowForm(false)
      setSuccess('Test drive scheduled.')
      setReloadKey((key) => key + 1)
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to schedule test drive.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="CRM" title="Test drives" description="Schedule appointments and track every drive through completion." action={hasPermission('crm.write') ? <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Close form' : '+ Schedule test drive'}</button> : undefined} />
      <FeedbackMessage error={error} success={success} />
      {showForm ? (
        <form className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" onSubmit={submit}>
          <h2 className="text-lg font-semibold text-white">New appointment</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-zinc-400">Customer<select className={inputClassName} required value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))}>{customers.map((item) => <option key={item.id} value={item.id}>{customerName(item)}</option>)}</select></label>
            <label className="text-sm text-zinc-400">Vehicle<select className={inputClassName} required value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.modelYear} {item.make} {item.model} · {item.stockNumber}</option>)}</select></label>
            <label className="text-sm text-zinc-400">Location<select className={inputClassName} required value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>{locations.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-sm text-zinc-400">Related lead (optional)<select className={inputClassName} value={form.leadId} onChange={(event) => setForm((current) => ({ ...current, leadId: event.target.value }))}><option value="">No related lead</option>{leads.map((item) => <option key={item.id} value={item.id}>#{item.id} · {referenceCustomerName(item.customer)}</option>)}</select></label>
            <label className="text-sm text-zinc-400">Starts<input className={inputClassName} type="datetime-local" required value={form.scheduledStart} onChange={(event) => setForm((current) => ({ ...current, scheduledStart: event.target.value }))} /></label>
            <label className="text-sm text-zinc-400">Ends<input className={inputClassName} type="datetime-local" required value={form.scheduledEnd} onChange={(event) => setForm((current) => ({ ...current, scheduledEnd: event.target.value }))} /></label>
            <label className="text-sm text-zinc-400 sm:col-span-2 lg:col-span-3">Notes<textarea className={`${inputClassName} min-h-24`} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          </div>
          <button className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || !form.customerId || !form.vehicleId || !form.locationId}>{isSaving ? 'Scheduling…' : 'Schedule test drive'}</button>
        </form>
      ) : null}
      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        <div className="border-b border-zinc-800 p-4"><select className={`${inputClassName.replace('mt-2 ', '')} max-w-xs`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => <option key={value}>{value}</option>)}</select></div>
        {isLoading ? <p className="p-14 text-center text-sm text-zinc-500">Loading test drives…</p> : testDrives.length === 0 ? <EmptyState title="No test drives found" description="Schedule the first appointment or adjust the status filter." /> : <div className="overflow-x-auto"><table className="w-full min-w-4xl text-left"><thead><tr className="border-b border-zinc-800 text-[10px] tracking-wider text-zinc-600 uppercase"><th className="px-6 py-3">Customer</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{testDrives.map((item) => <tr key={item.id}><td className="px-6 py-4 text-sm text-white">{referenceCustomerName(item.customer)}<p className="mt-1 text-xs text-zinc-600">{item.customer.phone}</p></td><td className="px-4 py-4 text-sm text-zinc-400">{item.vehicle.modelYear} {item.vehicle.make} {item.vehicle.model}<p className="mt-1 text-xs text-zinc-600">{item.vehicle.stockNumber}</p></td><td className="px-4 py-4 text-xs text-zinc-400">{formatDate(item.scheduledStart, true)}<p className="mt-1 text-zinc-600">{item.location.name}</p></td><td className="px-4 py-4"><StatusBadge status={item.status} /></td><td className="px-6 py-4 text-right"><Link className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300" to={`/test-drives/${item.id}`}>Manage</Link></td></tr>)}</tbody></table></div>}
        <PaginationControls pagination={pagination} onPage={(page) => setPagination((current) => ({ ...current, page }))} />
      </section>
    </div>
  )
}
