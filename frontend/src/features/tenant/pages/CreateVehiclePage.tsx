import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createVehicle, listTenantLocations } from '../api/tenant-api'
import { FeedbackMessage, PageHeader, getErrorMessage, inputClassName } from '../components/TenantPage'
import type { TenantLocation } from '../types/tenant-domain'

const initialForm = { locationId: '', stockNumber: '', vin: '', condition: 'USED', make: '', model: '', trimLevel: '', modelYear: String(new Date().getFullYear()), bodyType: '', fuelType: '', transmission: '', drivetrain: '', engineDescription: '', mileageKm: '0', exteriorColor: '', interiorColor: '', registrationNumber: '', firstRegistrationDate: '', acquiredAt: '', purchasePrice: '', askingPrice: '', minimumPrice: '', primaryImageUrl: '', description: '' }

export function CreateVehiclePage() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [form, setForm] = useState(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void listTenantLocations().then((data) => { setLocations(data); setForm((current) => ({ ...current, locationId: String(data.find((item) => item.isPrimary)?.id ?? data[0]?.id ?? '') })) }).catch((loadError) => setError(getErrorMessage(loadError, 'Unable to load locations.'))) }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setError(null)
    try {
      const vehicle = await createVehicle({ ...form, locationId: Number(form.locationId), modelYear: Number(form.modelYear), mileageKm: Number(form.mileageKm), vin: form.vin || null, trimLevel: form.trimLevel || null, bodyType: form.bodyType || null, fuelType: form.fuelType || null, transmission: form.transmission || null, drivetrain: form.drivetrain || null, engineDescription: form.engineDescription || null, exteriorColor: form.exteriorColor || null, interiorColor: form.interiorColor || null, registrationNumber: form.registrationNumber || null, firstRegistrationDate: form.firstRegistrationDate || null, acquiredAt: form.acquiredAt ? new Date(form.acquiredAt).toISOString() : null, purchasePrice: form.purchasePrice || null, askingPrice: form.askingPrice || null, minimumPrice: form.minimumPrice || null, primaryImageUrl: form.primaryImageUrl || null, description: form.description || null })
      navigate(`/inventory/${vehicle.id}`, { replace: true })
    } catch (saveError) { setError(getErrorMessage(saveError, 'Unable to create the vehicle.')) } finally { setIsSaving(false) }
  }

  return <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><PageHeader eyebrow="Inventory" title="Add vehicle" description="Register dealership, technical, and pricing information for new inventory." action={<Link className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300" to="/inventory">Cancel</Link>} /><FeedbackMessage error={error} /><form className="mt-6 space-y-6" onSubmit={submit}><section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"><h2 className="text-lg font-semibold text-white">Vehicle information</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm text-zinc-300">Location<select className={inputClassName} value={form.locationId} required onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>{locations.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{Object.entries(form).filter(([field]) => !['locationId', 'description', 'condition'].includes(field)).map(([field, value]) => <label className="text-sm text-zinc-300" key={field}>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}<input className={inputClassName} type={field.includes('Price') || ['modelYear', 'mileageKm'].includes(field) ? 'number' : field.includes('Date') || field === 'acquiredAt' ? 'datetime-local' : 'text'} step={field.includes('Price') ? '0.01' : undefined} value={value} required={['stockNumber', 'make', 'model', 'modelYear', 'mileageKm'].includes(field)} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} /></label>)}<label className="text-sm text-zinc-300">Condition<select className={inputClassName} value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}><option>NEW</option><option>USED</option></select></label><label className="text-sm text-zinc-300 sm:col-span-2 lg:col-span-3">Description<textarea className={`${inputClassName} min-h-28`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label></div></section><div className="flex justify-end"><button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create vehicle'}</button></div></form></div>
}
