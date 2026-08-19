import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getTestDrive, updateTestDriveStatus } from '../api/tenant-api'
import { FeedbackMessage, PageHeader, StatusBadge, formatDate, getErrorMessage, inputClassName, referenceCustomerName } from '../components/TenantPage'
import type { TestDrive } from '../types/tenant-domain'

export function TestDriveDetailPage() {
  const { testDriveId } = useParams()
  const id = Number(testDriveId)
  const { hasPermission } = useAuth()
  const [testDrive, setTestDrive] = useState<TestDrive | null>(null)
  const [status, setStatus] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getTestDrive(id)
      setTestDrive(data)
      setStatus(data.status)
      setCancellationReason(data.cancellationReason ?? '')
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load test drive.'))
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
      await updateTestDriveStatus(id, { status, cancellationReason: status === 'CANCELLED' ? cancellationReason : null })
      setSuccess('Test drive status updated.')
      await load()
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update test drive.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <p className="p-12 text-sm text-zinc-500">Loading test drive…</p>
  if (!testDrive) return <div className="p-8"><FeedbackMessage error={error ?? 'Test drive not found.'} /></div>

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="CRM / Test drive" title={referenceCustomerName(testDrive.customer)} description={`${testDrive.vehicle.modelYear} ${testDrive.vehicle.make} ${testDrive.vehicle.model}`} action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/test-drives">Back to test drives</Link>} />
      <FeedbackMessage error={error} success={success} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold text-white">Appointment details</h2><StatusBadge status={testDrive.status} /></div>
          <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
            <div><dt className="text-zinc-600">Starts</dt><dd className="mt-1 text-zinc-300">{formatDate(testDrive.scheduledStart, true)}</dd></div>
            <div><dt className="text-zinc-600">Ends</dt><dd className="mt-1 text-zinc-300">{formatDate(testDrive.scheduledEnd, true)}</dd></div>
            <div><dt className="text-zinc-600">Location</dt><dd className="mt-1 text-zinc-300">{testDrive.location.name}</dd></div>
            <div><dt className="text-zinc-600">Salesperson</dt><dd className="mt-1 text-zinc-300">{testDrive.salesperson.firstName} {testDrive.salesperson.lastName}</dd></div>
            <div><dt className="text-zinc-600">Customer phone</dt><dd className="mt-1 text-zinc-300">{testDrive.customer.phone}</dd></div>
            <div><dt className="text-zinc-600">Stock number</dt><dd className="mt-1 text-zinc-300">{testDrive.vehicle.stockNumber}</dd></div>
          </dl>
          {testDrive.notes ? <p className="mt-6 border-t border-zinc-800 pt-5 text-sm leading-6 text-zinc-400">{testDrive.notes}</p> : null}
          {testDrive.cancellationReason ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{testDrive.cancellationReason}</p> : null}
        </section>
        {hasPermission('crm.write') ? <form className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" onSubmit={submit}><h2 className="text-sm font-semibold text-white">Update status</h2><select className={inputClassName} value={status} onChange={(event) => setStatus(event.target.value)}>{['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((value) => <option key={value}>{value}</option>)}</select>{status === 'CANCELLED' ? <textarea className={`${inputClassName} min-h-24`} required placeholder="Cancellation reason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} /> : null}<button className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50" disabled={isSaving || status === testDrive.status}>{isSaving ? 'Saving…' : 'Save status'}</button></form> : null}
      </div>
    </div>
  )
}
