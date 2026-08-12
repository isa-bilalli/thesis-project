import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '@/lib/api/api-client'
import { createPlatformTenant } from '../api/platform-tenant-api'
import { PlatformShell } from '../components/PlatformShell'

const inputClassName =
  'mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-600'

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function optionalValue(value: string): string | null {
  return value.trim() || null
}

export function CreateTenantPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugWasEdited, setSlugWasEdited] = useState(false)
  const [tenant, setTenant] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    currencyCode: 'EUR',
    timezone: 'Europe/Budapest',
  })
  const [location, setLocation] = useState({
    name: '',
    code: 'MAIN',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    countryCode: 'HU',
    phone: '',
    email: '',
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const createdTenant = await createPlatformTenant({
        name: tenant.name,
        slug: tenant.slug,
        contactEmail: optionalValue(tenant.contactEmail),
        contactPhone: optionalValue(tenant.contactPhone),
        currencyCode: tenant.currencyCode,
        timezone: tenant.timezone,
        primaryLocation: {
          name: location.name,
          code: location.code,
          addressLine1: location.addressLine1,
          addressLine2: optionalValue(location.addressLine2),
          city: location.city,
          postalCode: optionalValue(location.postalCode),
          countryCode: location.countryCode,
          phone: optionalValue(location.phone),
          email: optionalValue(location.email),
        },
      })

      navigate(`/platform/tenants/${createdTenant.id}`, {
        replace: true,
        state: { tenantCreated: true },
      })
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Unable to create the tenant.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PlatformShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="border-b border-zinc-800 pb-7">
          <Link
            className="text-sm font-medium text-zinc-500 transition hover:text-white"
            to="/platform/tenants"
          >
            ← Back to tenant registry
          </Link>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            Tenant provisioning
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Create a dealership tenant
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            This creates the dealership, its primary location, and the standard
            administrator, manager, and salesperson roles in one transaction.
          </p>
        </header>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                Step 1
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Dealership details
              </h2>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-300">
                Dealership name
                <input
                  className={inputClassName}
                  value={tenant.name}
                  maxLength={150}
                  placeholder="Example Motors"
                  required
                  onChange={(event) => {
                    const name = event.target.value
                    setTenant((current) => ({
                      ...current,
                      name,
                      slug: slugWasEdited ? current.slug : createSlug(name),
                    }))
                    setLocation((current) => ({
                      ...current,
                      name:
                        current.name && current.name !== `${tenant.name} Main`
                          ? current.name
                          : name
                            ? `${name} Main`
                            : '',
                    }))
                  }}
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                URL slug
                <input
                  className={inputClassName}
                  value={tenant.slug}
                  maxLength={100}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="example-motors"
                  required
                  onChange={(event) => {
                    setSlugWasEdited(true)
                    setTenant((current) => ({
                      ...current,
                      slug: createSlug(event.target.value),
                    }))
                  }}
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Contact email
                <input
                  className={inputClassName}
                  type="email"
                  value={tenant.contactEmail}
                  placeholder="admin@example.com"
                  onChange={(event) =>
                    setTenant((current) => ({
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
                  value={tenant.contactPhone}
                  placeholder="+36 30 123 4567"
                  onChange={(event) =>
                    setTenant((current) => ({
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
                  value={tenant.currencyCode}
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  required
                  onChange={(event) =>
                    setTenant((current) => ({
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
                  value={tenant.timezone}
                  maxLength={64}
                  placeholder="Europe/Budapest"
                  required
                  onChange={(event) =>
                    setTenant((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-zinc-600 uppercase">
                Step 2
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Primary location
              </h2>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-300">
                Location name
                <input
                  className={inputClassName}
                  value={location.name}
                  maxLength={150}
                  placeholder="Example Motors Main"
                  required
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Location code
                <input
                  className={inputClassName}
                  value={location.code}
                  maxLength={30}
                  pattern="[A-Za-z0-9_-]+"
                  required
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300 sm:col-span-2">
                Address line 1
                <input
                  className={inputClassName}
                  value={location.addressLine1}
                  maxLength={200}
                  placeholder="Street and building number"
                  required
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      addressLine1: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300 sm:col-span-2">
                Address line 2
                <input
                  className={inputClassName}
                  value={location.addressLine2}
                  maxLength={200}
                  placeholder="Unit, floor, or additional details"
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      addressLine2: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                City
                <input
                  className={inputClassName}
                  value={location.city}
                  maxLength={100}
                  required
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Postal code
                <input
                  className={inputClassName}
                  value={location.postalCode}
                  maxLength={20}
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Country code
                <input
                  className={inputClassName}
                  value={location.countryCode}
                  maxLength={2}
                  pattern="[A-Za-z]{2}"
                  required
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      countryCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300">
                Location phone
                <input
                  className={inputClassName}
                  type="tel"
                  value={location.phone}
                  maxLength={30}
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm font-medium text-zinc-300 sm:col-span-2">
                Location email
                <input
                  className={inputClassName}
                  type="email"
                  value={location.email}
                  placeholder="location@example.com"
                  onChange={(event) =>
                    setLocation((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </section>

          {error ? (
            <p
              className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              className="rounded-xl border border-zinc-800 px-5 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
              to="/platform/tenants"
            >
              Cancel
            </Link>
            <button
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating tenant…' : 'Create tenant'}
            </button>
          </div>
        </form>
      </div>
    </PlatformShell>
  )
}
