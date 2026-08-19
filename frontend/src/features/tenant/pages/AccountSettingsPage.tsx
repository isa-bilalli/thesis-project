import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { changePassword } from '../api/tenant-api'
import {
  FeedbackMessage,
  PageHeader,
  getErrorMessage,
  inputClassName,
} from '../components/TenantPage'

export function AccountSettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (form.newPassword !== form.confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    if (form.newPassword.length < 12) {
      setError('The new password must contain at least 12 characters.')
      return
    }

    setIsSaving(true)
    try {
      await changePassword(form.currentPassword, form.newPassword)
      await logout()
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed. Sign in with your new password.' },
      })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to change your password.'))
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Account"
        title="Account settings"
        description="Review your account and update your sign-in password."
      />
      <FeedbackMessage error={error} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Profile</h2>
          <dl className="mt-6 space-y-5 text-sm">
            <div>
              <dt className="text-zinc-600">Name</dt>
              <dd className="mt-1 text-zinc-200">
                {user?.firstName} {user?.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-600">Email</dt>
              <dd className="mt-1 text-zinc-200">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-600">Dealership</dt>
              <dd className="mt-1 text-zinc-200">{user?.tenant.name}</dd>
            </div>
            <div>
              <dt className="text-zinc-600">Roles</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {user?.roles.map((role) => (
                  <span
                    className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                    key={role}
                  >
                    {role.replaceAll('_', ' ')}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <p className="mt-6 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-600">
            Contact a dealership administrator to change your name, email, role,
            or default location.
          </p>
        </section>

        <form
          className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6"
          onSubmit={submit}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Change password</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Use 12–128 characters. Changing it signs out every active session.
              </p>
            </div>
            <button
              className="shrink-0 text-xs font-semibold text-zinc-400 hover:text-white"
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
            >
              {showPasswords ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-zinc-400">
              Current password
              <input
                autoComplete="current-password"
                className={inputClassName}
                type={showPasswords ? 'text' : 'password'}
                required
                value={form.currentPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm text-zinc-400">
              New password
              <input
                autoComplete="new-password"
                className={inputClassName}
                type={showPasswords ? 'text' : 'password'}
                minLength={12}
                maxLength={128}
                required
                value={form.newPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block text-sm text-zinc-400">
              Confirm new password
              <input
                autoComplete="new-password"
                className={inputClassName}
                type={showPasswords ? 'text' : 'password'}
                minLength={12}
                maxLength={128}
                required
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <button
            className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? 'Changing password…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  )
}
