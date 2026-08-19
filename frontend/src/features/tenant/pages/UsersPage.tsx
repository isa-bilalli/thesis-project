import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  createTenantUser,
  listTenantLocations,
  listTenantRoles,
  listTenantUsers,
  replaceTenantUserRoles,
  updateTenantUserStatus,
} from '../api/tenant-api'
import {
  FeedbackMessage,
  PageHeader,
  StatusBadge,
  formatDate,
  getErrorMessage,
  lightInputClassName,
} from '../components/TenantPage'
import type { TenantLocation, TenantRole, TenantUser } from '../types/tenant-domain'

export function UsersPage() {
  const { user: authenticatedUser } = useAuth()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [roles, setRoles] = useState<TenantRole[]>([])
  const [locations, setLocations] = useState<TenantLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    defaultLocationId: '',
    roleCode: 'SALESPERSON',
  })

  useEffect(() => {
    let active = true
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [userData, roleData, locationData] = await Promise.all([
          listTenantUsers(),
          listTenantRoles(),
          listTenantLocations(),
        ])
        if (active) {
          setUsers(userData)
          setRoles(roleData)
          setLocations(locationData)
          setForm((current) => ({
            ...current,
            defaultLocationId: current.defaultLocationId || String(locationData.find((item) => item.isPrimary)?.id ?? locationData[0]?.id ?? ''),
            roleCode: roleData.find((item) => item.code === 'SALESPERSON')?.code ?? roleData[0]?.code ?? current.roleCode,
          }))
        }
      } catch (loadError) {
        if (active) setError(getErrorMessage(loadError, 'Unable to load dealership users.'))
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [reloadKey])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await createTenantUser({
        ...form,
        defaultLocationId: Number(form.defaultLocationId),
        phone: form.phone.trim() || null,
      })
      setSuccess('User created successfully.')
      setShowForm(false)
      setForm((current) => ({ ...current, firstName: '', lastName: '', email: '', phone: '', password: '' }))
      setReloadKey((key) => key + 1)
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to create the user.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatus(user: TenantUser) {
    setError(null)
    setSuccess(null)
    try {
      await updateTenantUserStatus(user.id, user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')
      setSuccess(`${user.firstName} ${user.lastName}'s status was updated.`)
      setReloadKey((key) => key + 1)
    } catch (statusError) {
      setError(getErrorMessage(statusError, 'Unable to update the user status.'))
    }
  }

  async function handleRole(userId: number, roleCode: string) {
    setError(null)
    setSuccess(null)
    try {
      await replaceTenantUserRoles(userId, [roleCode])
      setSuccess('User role updated. Their existing sessions were revoked.')
      setReloadKey((key) => key + 1)
    } catch (roleError) {
      setError(getErrorMessage(roleError, 'Unable to update the user role.'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Administration"
        title="Dealership users"
        description="Create user accounts, assign operational roles, and control dealership access."
        action={
          <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black" type="button" onClick={() => setShowForm((show) => !show)}>
            {showForm ? 'Close form' : '+ Create user'}
          </button>
        }
      />
      <FeedbackMessage error={error} success={success} />

      {showForm ? (
        <form className="mt-6 rounded-2xl border border-zinc-800 bg-white p-5 text-black sm:p-6" onSubmit={handleCreate}>
          <h2 className="text-lg font-semibold">New dealership user</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(['firstName', 'lastName', 'email', 'phone'] as const).map((field) => (
              <label className="text-sm font-medium text-zinc-700" key={field}>
                {field === 'firstName' ? 'First name' : field === 'lastName' ? 'Last name' : field === 'email' ? 'Email' : 'Phone'}
                <input className={lightInputClassName} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} value={form[field]} required={field !== 'phone'} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} />
              </label>
            ))}
            <label className="text-sm font-medium text-zinc-700">
              Default location
              <select className={lightInputClassName} value={form.defaultLocationId} required onChange={(event) => setForm((current) => ({ ...current, defaultLocationId: event.target.value }))}>
                {locations.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700">
              Role
              <select className={lightInputClassName} value={form.roleCode} required onChange={(event) => setForm((current) => ({ ...current, roleCode: event.target.value }))}>
                {roles.map((role) => <option key={role.id} value={role.code}>{role.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-zinc-700 sm:col-span-2 lg:col-span-3">
              Temporary password
              <div className="relative">
                <input className={`${lightInputClassName} pr-20`} type={showPassword ? 'text' : 'password'} minLength={12} maxLength={128} value={form.password} required onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                <button className="absolute inset-y-0 right-3 mt-2 text-xs font-semibold text-zinc-500" type="button" onClick={() => setShowPassword((show) => !show)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </label>
          </div>
          <button className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create user'}</button>
        </form>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
        {isLoading ? <p className="px-6 py-14 text-center text-sm text-zinc-500">Loading users…</p> : users.length === 0 ? <p className="px-6 py-14 text-center text-sm text-zinc-500">No users found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left">
              <thead><tr className="border-b border-zinc-800 text-[10px] tracking-wider text-zinc-600 uppercase"><th className="px-6 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-zinc-800">{users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-800/30">
                  <td className="px-6 py-4"><p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p><p className="mt-1 text-xs text-zinc-600">{user.email}</p></td>
                  <td className="px-4 py-4"><select className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300" value={user.roles[0] ?? ''} disabled={user.id === authenticatedUser?.id} onChange={(event) => void handleRole(user.id, event.target.value)}>{roles.map((role) => <option key={role.id} value={role.code}>{role.name}</option>)}</select></td>
                  <td className="px-4 py-4 text-xs text-zinc-500">{formatDate(user.lastLoginAt, true)}</td>
                  <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                  <td className="px-6 py-4 text-right"><button className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-40" type="button" disabled={user.id === authenticatedUser?.id} onClick={() => void handleStatus(user)}>{user.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
