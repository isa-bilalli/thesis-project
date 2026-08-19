import { useEffect, useState, type FormEvent } from 'react'
import {
  createTenantLocation,
  listTenantLocations,
  setPrimaryTenantLocation,
  updateTenantLocation,
  updateTenantLocationStatus,
} from '../api/tenant-api'
import { FeedbackMessage, PageHeader, StatusBadge, getErrorMessage, lightInputClassName } from '../components/TenantPage'
import type { TenantLocation } from '../types/tenant-domain'

const emptyForm = { name: '', code: '', addressLine1: '', addressLine2: '', city: '', postalCode: '', countryCode: 'HU', phone: '', email: '' }

export function LocationsPage() {
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    listTenantLocations().then((data) => { if (active) setLocations(data) }).catch((loadError) => { if (active) setError(getErrorMessage(loadError, 'Unable to load locations.')) }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  function edit(location: TenantLocation) {
    setEditingId(location.id)
    setForm({ name: location.name, code: location.code, addressLine1: location.addressLine1, addressLine2: location.addressLine2 ?? '', city: location.city, postalCode: location.postalCode ?? '', countryCode: location.countryCode, phone: location.phone ?? '', email: location.email ?? '' })
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setError(null); setSuccess(null)
    const payload = { ...form, addressLine2: form.addressLine2 || null, postalCode: form.postalCode || null, phone: form.phone || null, email: form.email || null }
    try {
      if (editingId) await updateTenantLocation(editingId, payload)
      else await createTenantLocation(payload)
      setSuccess(editingId ? 'Location updated.' : 'Location created.')
      setForm(emptyForm); setEditingId(null); setShowForm(false); setReloadKey((key) => key + 1)
    } catch (saveError) { setError(getErrorMessage(saveError, 'Unable to save the location.')) } finally { setIsSaving(false) }
  }

  async function mutate(action: () => Promise<unknown>, message: string) {
    setError(null); setSuccess(null)
    try { await action(); setSuccess(message); setReloadKey((key) => key + 1) } catch (actionError) { setError(getErrorMessage(actionError, 'Unable to update the location.')) }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader eyebrow="Administration" title="Dealership locations" description="Manage dealership branches, operational status, and the primary location." action={<button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black" type="button" onClick={() => { setShowForm((show) => !show); setEditingId(null); setForm(emptyForm) }}>{showForm ? 'Close form' : '+ Add location'}</button>} />
      <FeedbackMessage error={error} success={success} />
      {showForm ? (
        <form className="mt-6 rounded-2xl border border-zinc-800 bg-white p-5 text-black sm:p-6" onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold">{editingId ? 'Edit location' : 'New location'}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(form).map(([field, value]) => (
            <label className={`text-sm font-medium text-zinc-700 ${field === 'addressLine1' || field === 'addressLine2' ? 'sm:col-span-2' : ''}`} key={field}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}<input className={lightInputClassName} type={field === 'email' ? 'email' : 'text'} value={value} required={['name', 'code', 'addressLine1', 'city', 'countryCode'].includes(field)} maxLength={field === 'countryCode' ? 2 : undefined} onChange={(event) => setForm((current) => ({ ...current, [field]: field === 'code' || field === 'countryCode' ? event.target.value.toUpperCase() : event.target.value }))} /></label>
          ))}</div>
          <button className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create location'}</button>
        </form>
      ) : null}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? <p className="text-sm text-zinc-500">Loading locations…</p> : locations.map((location) => (
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" key={location.id}>
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-white">{location.name}</h2><p className="mt-1 font-mono text-xs text-zinc-600">{location.code}</p></div>{location.isPrimary ? <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-400/20">PRIMARY</span> : <StatusBadge status={location.status} />}</div>
            <p className="mt-5 text-sm text-zinc-400">{location.addressLine1}{location.addressLine2 ? `, ${location.addressLine2}` : ''}</p><p className="mt-1 text-sm text-zinc-500">{[location.postalCode, location.city, location.countryCode].filter(Boolean).join(', ')}</p>
            <div className="mt-5 flex flex-wrap gap-2"><button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300" type="button" onClick={() => edit(location)}>Edit</button>{!location.isPrimary ? <><button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300" type="button" onClick={() => void mutate(() => setPrimaryTenantLocation(location.id), 'Primary location updated.')}>Make primary</button><button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300" type="button" onClick={() => void mutate(() => updateTenantLocationStatus(location.id, location.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'), 'Location status updated.')}>{location.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></> : null}</div>
          </article>
        ))}
      </section>
    </div>
  )
}
