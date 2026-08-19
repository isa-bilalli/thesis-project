import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  addLeadVehicle,
  createLeadActivity,
  getLead,
  listLeadActivities,
  listLeadVehicles,
  listVehicles,
  removeLeadVehicle,
  updateLeadActivityStatus,
  updateLeadStatus,
} from '../api/tenant-api'
import {
  EmptyState,
  FeedbackMessage,
  PageHeader,
  StatusBadge,
  formatCurrency,
  formatDate,
  getErrorMessage,
  inputClassName,
  referenceCustomerName,
} from '../components/TenantPage'
import type {
  Lead,
  LeadActivity,
  LeadVehicleInterest,
  VehicleListItem,
} from '../types/tenant-domain'

const activityTypes = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP']
const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']

export function LeadDetailPage() {
  const { leadId } = useParams()
  const id = Number(leadId)
  const { user, hasPermission } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [interests, setInterests] = useState<LeadVehicleInterest[]>([])
  const [availableVehicles, setAvailableVehicles] = useState<VehicleListItem[]>([])
  const [status, setStatus] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [interestNotes, setInterestNotes] = useState('')
  const [activity, setActivity] = useState({
    activityType: 'NOTE',
    status: 'COMPLETED',
    subject: '',
    details: '',
    outcome: '',
    scheduledAt: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError('Invalid lead ID.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [leadData, activityData, interestData, vehicleData] =
        await Promise.all([
          getLead(id),
          listLeadActivities(id),
          listLeadVehicles(id),
          listVehicles({ status: 'AVAILABLE', limit: 100 }),
        ])
      setLead(leadData)
      setStatus(leadData.status)
      setLostReason(leadData.lostReason ?? '')
      setActivities(activityData)
      setInterests(interestData)
      setAvailableVehicles(vehicleData.vehicles)
      setVehicleId(String(vehicleData.vehicles[0]?.id ?? ''))
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load lead.'))
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

  const unlinkedVehicles = useMemo(
    () =>
      availableVehicles.filter(
        (vehicle) =>
          !interests.some((interest) => interest.vehicle.id === vehicle.id),
      ),
    [availableVehicles, interests],
  )

  async function changeStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await updateLeadStatus(id, status, status === 'LOST' ? lostReason : null)
      setSuccess('Lead status updated.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update lead status.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await createLeadActivity(id, {
        userId: user?.id,
        activityType: activity.activityType,
        status: activity.status,
        subject: activity.subject || null,
        details: activity.details || null,
        outcome: activity.outcome || null,
        scheduledAt: activity.scheduledAt
          ? new Date(activity.scheduledAt).toISOString()
          : null,
      })
      setActivity({
        activityType: 'NOTE',
        status: 'COMPLETED',
        subject: '',
        details: '',
        outcome: '',
        scheduledAt: '',
      })
      setSuccess('Activity added.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to add activity.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function completeActivity(activityId: number) {
    setError(null)
    try {
      await updateLeadActivityStatus(activityId, {
        status: 'COMPLETED',
        outcome: 'Completed from the lead workspace',
      })
      setSuccess('Activity completed.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to complete activity.'))
    }
  }

  async function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await addLeadVehicle(id, {
        vehicleId: Number(vehicleId),
        isPrimary: interests.length === 0,
        interestNotes: interestNotes || null,
      })
      setInterestNotes('')
      setSuccess('Vehicle interest added.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to add vehicle interest.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function removeVehicle(vehicleIdToRemove: number) {
    setError(null)
    try {
      await removeLeadVehicle(id, vehicleIdToRemove)
      setSuccess('Vehicle interest removed.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to remove vehicle interest.'))
    }
  }

  if (isLoading) {
    return <p className="p-12 text-sm text-zinc-500">Loading lead…</p>
  }

  if (!lead) {
    return (
      <div className="p-8">
        <FeedbackMessage error={error ?? 'Lead not found.'} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="CRM / Lead"
        title={referenceCustomerName(lead.customer)}
        description={`Lead #${lead.id} · ${lead.location.name} · ${lead.priority} priority`}
        action={
          <Link
            className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300"
            to="/leads"
          >
            Back to leads
          </Link>
        }
      />
      <FeedbackMessage error={error} success={success} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-wider text-zinc-600 uppercase">Opportunity</p>
                <div className="mt-3"><StatusBadge status={lead.status} /></div>
              </div>
              <p className="text-sm text-zinc-400">
                Budget {formatCurrency(lead.budgetMin, user?.tenant.currencyCode)} –{' '}
                {formatCurrency(lead.budgetMax, user?.tenant.currencyCode)}
              </p>
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-zinc-600">Source</dt><dd className="mt-1 text-zinc-300">{lead.source.replaceAll('_', ' ')}</dd></div>
              <div><dt className="text-zinc-600">Next follow-up</dt><dd className="mt-1 text-zinc-300">{formatDate(lead.nextFollowUpAt, true)}</dd></div>
              <div><dt className="text-zinc-600">Assigned to</dt><dd className="mt-1 text-zinc-300">{lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'Unassigned'}</dd></div>
            </dl>
            {lead.notes ? <p className="mt-5 border-t border-zinc-800 pt-5 text-sm leading-6 text-zinc-400">{lead.notes}</p> : null}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="text-lg font-semibold text-white">Activity timeline</h2>
            {hasPermission('crm.write') ? (
              <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addActivity}>
                <label className="text-xs text-zinc-500">Type<select className={inputClassName} value={activity.activityType} onChange={(event) => setActivity((current) => ({ ...current, activityType: event.target.value }))}>{activityTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="text-xs text-zinc-500">Status<select className={inputClassName} value={activity.status} onChange={(event) => setActivity((current) => ({ ...current, status: event.target.value }))}><option>COMPLETED</option><option>SCHEDULED</option></select></label>
                <label className="text-xs text-zinc-500 sm:col-span-2">Subject<input className={inputClassName} value={activity.subject} onChange={(event) => setActivity((current) => ({ ...current, subject: event.target.value }))} /></label>
                {activity.status === 'SCHEDULED' ? <label className="text-xs text-zinc-500 sm:col-span-2">Scheduled for<input className={inputClassName} type="datetime-local" required value={activity.scheduledAt} onChange={(event) => setActivity((current) => ({ ...current, scheduledAt: event.target.value }))} /></label> : null}
                <label className="text-xs text-zinc-500 sm:col-span-2">Details<textarea className={`${inputClassName} min-h-24`} value={activity.details} onChange={(event) => setActivity((current) => ({ ...current, details: event.target.value }))} /></label>
                <button className="w-fit rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving}>Add activity</button>
              </form>
            ) : null}
            <div className="mt-6 divide-y divide-zinc-800">
              {activities.length === 0 ? <EmptyState title="No activity yet" description="Add a note or schedule the next customer contact." /> : activities.map((item) => (
                <article className="py-4" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm font-medium text-zinc-200">{item.subject || item.activityType.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-zinc-600">{item.user.firstName} {item.user.lastName} · {formatDate(item.scheduledAt ?? item.createdAt, true)}</p></div>
                    <div className="flex items-center gap-2"><StatusBadge status={item.status} />{hasPermission('crm.write') && item.status === 'SCHEDULED' ? <button className="text-xs font-semibold text-emerald-300" type="button" onClick={() => void completeActivity(item.id)}>Complete</button> : null}</div>
                  </div>
                  {item.details ? <p className="mt-3 text-sm leading-6 text-zinc-500">{item.details}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {hasPermission('crm.write') ? (
            <form className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" onSubmit={changeStatus}>
              <h2 className="text-sm font-semibold text-white">Update lead status</h2>
              <select className={inputClassName} value={status} onChange={(event) => setStatus(event.target.value)}>{leadStatuses.map((value) => <option key={value}>{value}</option>)}</select>
              {status === 'LOST' ? <textarea className={`${inputClassName} min-h-20`} placeholder="Reason this opportunity was lost" required value={lostReason} onChange={(event) => setLostReason(event.target.value)} /> : null}
              <button className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || status === lead.status}>Save status</button>
            </form>
          ) : null}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="text-sm font-semibold text-white">Vehicle interests</h2>
            {hasPermission('crm.write') && unlinkedVehicles.length > 0 ? (
              <form className="mt-4" onSubmit={addVehicle}>
                <select className={inputClassName} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>{unlinkedVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.modelYear} {vehicle.make} {vehicle.model} · {vehicle.stockNumber}</option>)}</select>
                <input className={inputClassName} placeholder="Interest notes (optional)" value={interestNotes} onChange={(event) => setInterestNotes(event.target.value)} />
                <button className="mt-3 w-full rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 disabled:opacity-50" disabled={isSaving || !vehicleId}>Add vehicle</button>
              </form>
            ) : null}
            <div className="mt-4 space-y-3">
              {interests.length === 0 ? <p className="text-xs text-zinc-600">No vehicle interests recorded.</p> : interests.map((interest) => (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4" key={interest.vehicle.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div><Link className="text-sm font-medium text-white hover:underline" to={`/inventory/${interest.vehicle.id}`}>{interest.vehicle.modelYear} {interest.vehicle.make} {interest.vehicle.model}</Link><p className="mt-1 text-xs text-zinc-600">{interest.vehicle.stockNumber}{interest.isPrimary ? ' · Primary' : ''}</p></div>
                    {hasPermission('crm.write') ? <button className="text-xs text-red-300" type="button" onClick={() => void removeVehicle(interest.vehicle.id)}>Remove</button> : null}
                  </div>
                  {interest.interestNotes ? <p className="mt-3 text-xs leading-5 text-zinc-500">{interest.interestNotes}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
