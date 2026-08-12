import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError } from '@/lib/api/api-client'
import {
  createPlatformTenantUser,
  getPlatformTenant,
  listPlatformTenantLocations,
  listPlatformTenantRoles,
  listPlatformTenantUsers,
  updatePlatformTenant,
  updatePlatformTenantStatus,
  updatePlatformTenantUserStatus,
} from '../api/platform-tenant-api'
import { PlatformShell } from '../components/PlatformShell'
import type {
  PlatformLocation,
  PlatformTenant,
  PlatformTenantRole,
  PlatformTenantUser,
  TenantRoleCode,
  TenantStatus,
} from '../types/platform-tenant'
import {
  formatPlatformDate,
  tenantStatusClass,
  userStatusClass,
} from '../utils/platform-formatters'

const inputClassName =
  'mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function roleLabel(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function TenantDetailPage() {
  const { tenantId: tenantIdParameter } = useParams()
  const routeLocation = useLocation()
  const tenantId = Number(tenantIdParameter)
  const [tenant, setTenant] = useState<PlatformTenant | null>(null)
  const [locations, setLocations] = useState<PlatformLocation[]>([])
  const [users, setUsers] = useState<PlatformTenantUser[]>([])
  const [roles, setRoles] = useState<PlatformTenantRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [changingUserId, setChangingUserId] = useState<number | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(
    routeLocation.state &&
      typeof routeLocation.state === 'object' &&
      'tenantCreated' in routeLocation.state
      ? 'Tenant created successfully. You can now provision its first administrator.'
      : null,
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [details, setDetails] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    currencyCode: '',
    timezone: '',
  })
  const [pendingStatus, setPendingStatus] = useState<TenantStatus>('ACTIVE')
  const [newUser, setNewUser] = useState({
    defaultLocationId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    roleCode: 'DEALERSHIP_ADMIN' as TenantRoleCode,
  })

  useEffect(() => {
    let isActive = true

    async function loadTenant() {
      if (!Number.isInteger(tenantId) || tenantId <= 0) {
        setPageError('A valid tenant ID is required.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setPageError(null)

      try {
        const [tenantData, locationData, userData, roleData] =
          await Promise.all([
            getPlatformTenant(tenantId),
            listPlatformTenantLocations(tenantId),
            listPlatformTenantUsers(tenantId),
            listPlatformTenantRoles(tenantId),
          ])

        if (!isActive) {
          return
        }

        setTenant(tenantData)
        setLocations(locationData)
        setUsers(userData)
        setRoles(roleData)
        setDetails({
          name: tenantData.name,
          contactEmail: tenantData.contactEmail ?? '',
          contactPhone: tenantData.contactPhone ?? '',
          currencyCode: tenantData.currencyCode,
          timezone: tenantData.timezone,
        })
        setPendingStatus(tenantData.status)
        setNewUser((current) => ({
          ...current,
          defaultLocationId: String(
            locationData.find((location) => location.isPrimary)?.id ??
              locationData[0]?.id ??
              '',
          ),
          roleCode:
            roleData.find((role) => role.code === 'DEALERSHIP_ADMIN')?.code ??
            roleData[0]?.code ??
            current.roleCode,
        }))
      } catch (loadError) {
        if (isActive) {
          setPageError(errorMessage(loadError, 'Unable to load this tenant.'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadTenant()

    return () => {
      isActive = false
    }
  }, [reloadKey, tenantId])

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccess(null)
    setIsSavingDetails(true)

    try {
      const updatedTenant = await updatePlatformTenant(tenantId, {
        name: details.name,
        contactEmail: details.contactEmail.trim() || null,
        contactPhone: details.contactPhone.trim() || null,
        currencyCode: details.currencyCode,
        timezone: details.timezone,
      })
      setTenant(updatedTenant)
      setSuccess('Tenant details updated successfully.')
    } catch (saveError) {
      setActionError(errorMessage(saveError, 'Unable to update tenant details.'))
    } finally {
      setIsSavingDetails(false)
    }
  }

  async function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccess(null)
    setIsSavingStatus(true)

    try {
      const updatedTenant = await updatePlatformTenantStatus(
        tenantId,
        pendingStatus,
      )
      setTenant(updatedTenant)
      setSuccess(`Tenant status changed to ${updatedTenant.status}.`)
    } catch (saveError) {
      setActionError(errorMessage(saveError, 'Unable to update tenant status.'))
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setSuccess(null)
    setIsCreatingUser(true)

    try {
      const createdUser = await createPlatformTenantUser(tenantId, {
        defaultLocationId: Number(newUser.defaultLocationId),
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone.trim() || null,
        password: newUser.password,
        roleCode: newUser.roleCode,
      })

      setUsers((current) => [createdUser, ...current])
      setTenant((current) =>
        current ? { ...current, userCount: current.userCount + 1 } : current,
      )
      setNewUser((current) => ({
        ...current,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
      }))
      setSuccess(`${createdUser.firstName} ${createdUser.lastName} was created.`)
    } catch (createError) {
      setActionError(errorMessage(createError, 'Unable to create this user.'))
    } finally {
      setIsCreatingUser(false)
    }
  }

  async function handleUserStatus(user: PlatformTenantUser) {
    const status = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    setActionError(null)
    setSuccess(null)
    setChangingUserId(user.id)

    try {
      const updatedUser = await updatePlatformTenantUserStatus(
        tenantId,
        user.id,
        status,
      )
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, status: updatedUser.status } : item,
        ),
      )
      setSuccess(
        `${user.firstName} ${user.lastName} is now ${updatedUser.status.toLowerCase()}.`,
      )
    } catch (statusError) {
      setActionError(errorMessage(statusError, 'Unable to change user status.'))
    } finally {
      setChangingUserId(null)
    }
  }

  if (isLoading) {
    return (
      <PlatformShell>
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-zinc-500">
          Loading tenant workspace…
        </div>
      </PlatformShell>
    )
  }

  if (pageError || !tenant) {
    return (
      <PlatformShell>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold text-white">Tenant unavailable</h1>
          <p className="mt-3 text-sm text-zinc-500">
            {pageError ?? 'This tenant could not be found.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300"
              to="/platform/tenants"
            >
              Back to tenants
            </Link>
            <button
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      </PlatformShell>
    )
  }

  return (
    <PlatformShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-5 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              className="text-sm font-medium text-zinc-500 transition hover:text-white"
              to="/platform/tenants"
            >
              ← Back to tenant registry
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {tenant.name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${tenantStatusClass(tenant.status)}`}
              >
                {tenant.status}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-zinc-600">{tenant.slug}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-80">
            {[
              { label: 'Locations', value: tenant.locationCount },
              { label: 'Users', value: tenant.userCount },
              { label: 'Currency', value: tenant.currencyCode },
            ].map((item) => (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3" key={item.label}>
                <p className="text-lg font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-[10px] tracking-wide text-zinc-600 uppercase">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </header>

        {success ? (
          <p
            className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
            role="status"
          >
            {success}
          </p>
        ) : null}
        {actionError ? (
          <p
            className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
            role="alert"
          >
            {actionError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <form
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
            onSubmit={handleDetailsSubmit}
          >
            <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
              General settings
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Tenant details
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-300 sm:col-span-2">
                Tenant name
                <input
                  className={inputClassName}
                  value={details.name}
                  maxLength={150}
                  required
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Contact email
                <input
                  className={inputClassName}
                  type="email"
                  value={details.contactEmail}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      contactEmail: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Contact phone
                <input
                  className={inputClassName}
                  type="tel"
                  maxLength={30}
                  value={details.contactPhone}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      contactPhone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Currency code
                <input
                  className={inputClassName}
                  value={details.currencyCode}
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  required
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      currencyCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                IANA timezone
                <input
                  className={inputClassName}
                  value={details.timezone}
                  maxLength={64}
                  required
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                type="submit"
                disabled={isSavingDetails}
              >
                {isSavingDetails ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>

          <div className="space-y-6">
            <form
              className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5"
              onSubmit={handleStatusSubmit}
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                Access control
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Tenant status
              </h2>
              <select
                className={inputClassName}
                value={pendingStatus}
                onChange={(event) =>
                  setPendingStatus(event.target.value as TenantStatus)
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Suspended and inactive tenants cannot authenticate into the dealership application.
              </p>
              <button
                className="mt-5 w-full rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                type="submit"
                disabled={isSavingStatus || pendingStatus === tenant.status}
              >
                {isSavingStatus ? 'Updating…' : 'Update status'}
              </button>
            </form>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                Record
              </p>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Tenant ID</dt>
                  <dd className="font-mono text-zinc-300">{tenant.id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Created</dt>
                  <dd className="text-zinc-300">
                    {formatPlatformDate(tenant.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Last updated</dt>
                  <dd className="text-zinc-300">
                    {formatPlatformDate(tenant.updatedAt)}
                  </dd>
                </div>
              </dl>
            </article>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="border-b border-zinc-800 px-5 py-5 sm:px-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
              Dealership footprint
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Locations</h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {locations.map((location) => (
              <article
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                key={location.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{location.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-zinc-600">
                      {location.code}
                    </p>
                  </div>
                  {location.isPrimary ? (
                    <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-400/20">
                      PRIMARY
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  {location.addressLine1}
                  {location.addressLine2 ? `, ${location.addressLine2}` : ''}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {[location.postalCode, location.city, location.countryCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)]">
          <form
            className="rounded-2xl border border-zinc-800 bg-white p-5 text-black sm:p-6"
            onSubmit={handleCreateUser}
          >
            <p className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
              User provisioning
            </p>
            <h2 className="mt-1 text-lg font-semibold">Create dealership user</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Create the tenant's first administrator or add another operational user.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-700">
                First name
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  value={newUser.firstName}
                  maxLength={100}
                  required
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Last name
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  value={newUser.lastName}
                  maxLength={100}
                  required
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  type="email"
                  value={newUser.email}
                  required
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Phone
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  type="tel"
                  value={newUser.phone}
                  maxLength={30}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-700">
                Role
                <select
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  value={newUser.roleCode}
                  required
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      roleCode: event.target.value as TenantRoleCode,
                    }))
                  }
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
                Default location
                <select
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-600"
                  value={newUser.defaultLocationId}
                  required
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      defaultLocationId: event.target.value,
                    }))
                  }
                >
                  {locations
                    .filter((location) => location.status === 'ACTIVE')
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} — {location.city}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-medium text-zinc-700 sm:col-span-2">
                Temporary password
                <div className="relative mt-2">
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-18 text-sm outline-none focus:border-zinc-600"
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                    onChange={(event) =>
                      setNewUser((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                  <button
                    className="absolute inset-y-0 right-3 text-xs font-semibold text-zinc-500"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span className="mt-2 block text-xs font-normal text-zinc-500">
                  Use 12–128 characters. Share it with the user securely.
                </span>
              </label>
            </div>

            {roles.length === 0 ? (
              <p className="mt-5 rounded-xl bg-amber-100 p-3 text-xs text-amber-900">
                This tenant has no assignable roles. Run the latest backend migration before provisioning users.
              </p>
            ) : null}

            <button
              className="mt-6 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={
                isCreatingUser ||
                roles.length === 0 ||
                locations.length === 0
              }
            >
              {isCreatingUser ? 'Creating user…' : 'Create user'}
            </button>
          </form>

          <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="border-b border-zinc-800 px-5 py-5 sm:px-6">
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                Accounts
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Dealership users
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-medium text-zinc-300">
                  No users have been provisioned.
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Use the form to create the first dealership administrator.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-3xl border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Last login</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-zinc-200">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">{user.email}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-400">
                          {user.roles.map(roleLabel).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-500">
                          {user.lastLoginAt
                            ? formatPlatformDate(user.lastLoginAt)
                            : 'Never'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${userStatusClass(user.status)}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                            type="button"
                            disabled={changingUserId === user.id}
                            onClick={() => void handleUserStatus(user)}
                          >
                            {changingUserId === user.id
                              ? 'Updating…'
                              : user.status === 'ACTIVE'
                                ? 'Disable'
                                : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </div>
    </PlatformShell>
  )
}
