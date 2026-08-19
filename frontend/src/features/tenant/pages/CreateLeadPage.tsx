import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createLead, listCustomers, listTenantLocations } from '../api/tenant-api'
import {
  FeedbackMessage,
  PageHeader,
  customerName,
  getErrorMessage,
  inputClassName,
} from '../components/TenantPage'
import type { Customer, TenantLocation } from '../types/tenant-domain'

const sources = [
  'WALK_IN',
  'WEBSITE',
  'PHONE',
  'EMAIL',
  'REFERRAL',
  'SOCIAL_MEDIA',
  'OTHER',
]

export function CreateLeadPage() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    locationId: '',
    customerId: '',
    source: 'WALK_IN',
    priority: 'NORMAL',
    budgetMin: '',
    budgetMax: '',
    lastContactAt: '',
    nextFollowUpAt: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([listCustomers({ limit: 100 }), listTenantLocations()])
      .then(([customerData, locationData]) => {
        const availableCustomers = customerData.customers.filter(
          (item) => item.status !== 'INACTIVE',
        )
        setCustomers(availableCustomers)
        setLocations(locationData)
        setForm((current) => ({
          ...current,
          customerId: String(availableCustomers[0]?.id ?? ''),
          locationId: String(
            locationData.find((item) => item.isPrimary)?.id ??
              locationData[0]?.id ??
              '',
          ),
        }))
      })
      .catch((loadError) =>
        setError(getErrorMessage(loadError, 'Unable to load lead references.')),
      )
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const lead = await createLead({
        locationId: Number(form.locationId),
        customerId: Number(form.customerId),
        assignedToUserId: null,
        source: form.source,
        priority: form.priority,
        budgetMin: form.budgetMin || null,
        budgetMax: form.budgetMax || null,
        lastContactAt: form.lastContactAt
          ? new Date(form.lastContactAt).toISOString()
          : null,
        nextFollowUpAt: form.nextFollowUpAt
          ? new Date(form.nextFollowUpAt).toISOString()
          : null,
        notes: form.notes || null,
      })
      navigate(`/leads/${lead.id}`, { replace: true })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to create lead.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="CRM"
        title="Create lead"
        description="Start a customer opportunity and schedule its next follow-up."
        action={
          <Link
            className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300"
            to="/leads"
          >
            Cancel
          </Link>
        }
      />
      <FeedbackMessage error={error} />
      <form
        className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Customer
            <select
              className={inputClassName}
              value={form.customerId}
              required
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customerId: event.target.value,
                }))
              }
            >
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {customerName(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            Location
            <select
              className={inputClassName}
              value={form.locationId}
              required
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locationId: event.target.value,
                }))
              }
            >
              {locations
                .filter((item) => item.status === 'ACTIVE')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            Source
            <select
              className={inputClassName}
              value={form.source}
              onChange={(event) =>
                setForm((current) => ({ ...current, source: event.target.value }))
              }
            >
              {sources.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-300">
            Priority
            <select
              className={inputClassName}
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value,
                }))
              }
            >
              {['LOW', 'NORMAL', 'HIGH'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {(['budgetMin', 'budgetMax'] as const).map((field) => (
            <label className="text-sm text-zinc-300" key={field}>
              {field === 'budgetMin' ? 'Minimum budget' : 'Maximum budget'}
              <input
                className={inputClassName}
                type="number"
                step="0.01"
                min="0"
                value={form[field]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
          {(['lastContactAt', 'nextFollowUpAt'] as const).map((field) => (
            <label className="text-sm text-zinc-300" key={field}>
              {field === 'lastContactAt' ? 'Last contact' : 'Next follow-up'}
              <input
                className={inputClassName}
                type="datetime-local"
                value={form[field]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
          <label className="text-sm text-zinc-300 sm:col-span-2">
            Notes
            <textarea
              className={`${inputClassName} min-h-28`}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
        </div>
        <button
          className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
          disabled={isSaving || !form.customerId || !form.locationId}
        >
          {isSaving ? 'Creating…' : 'Create lead'}
        </button>
      </form>
    </div>
  )
}
