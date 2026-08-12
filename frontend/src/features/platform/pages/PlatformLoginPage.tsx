import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import loginButtonIcon from '@/assets/icons8-login-button-100.png'
import loginBackground from '@/assets/loginBackground.png'
import { ApiError } from '@/lib/api/api-client'
import { usePlatformAuth } from '../hooks/usePlatformAuth'

export function PlatformLoginPage() {
  const navigate = useNavigate()
  const { login } = usePlatformAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate('/platform/dashboard', { replace: true })
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="flex min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <div className="flex min-h-screen w-full items-center px-[clamp(1rem,6vw,6.25rem)] py-[clamp(1.5rem,4vw,4rem)]">
        <div className="flex w-full max-w-[clamp(20rem,27vw,31.5rem)] min-w-0 flex-col">
          <h1 className="mb-[clamp(1.125rem,2.25vw,2.25rem)] text-[clamp(1.5rem,2.25vw,2.25rem)] leading-none font-bold text-white text-center">
            Welcome back
          </h1>
          <form
            className="flex flex-col gap-[clamp(0.75rem,1.125vw,1.125rem)]"
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
          >
            <input
              type="email"
              className="w-[60%] self-center rounded-md border border-gray-800 px-[clamp(0.75rem,1.125vw,1rem)] py-[clamp(0.625rem,1.05vw,0.875rem)] text-[clamp(0.875rem,0.9375vw,1rem)] text-gray-300 focus:border-gray-600 focus:outline-none"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <div className="relative w-[60%] self-center">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-md border border-gray-800 py-[clamp(0.625rem,1.05vw,0.875rem)] pr-[clamp(4rem,4.5vw,4.5rem)] pl-[clamp(0.75rem,1.125vw,1rem)] text-[clamp(0.875rem,0.9375vw,1rem)] text-gray-300 focus:border-gray-600 focus:outline-none"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-[clamp(0.625rem,0.9375vw,1rem)] text-[clamp(0.75rem,0.75vw,0.875rem)] font-medium text-gray-400 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((isVisible) => !isVisible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {error ? (
              <p
                className="text-center text-[clamp(0.75rem,0.75vw,0.875rem)] text-red-300"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="mx-auto mt-[clamp(0.375rem,0.75vw,0.75rem)] grid size-[clamp(3rem,3.75vw,4.75rem)] shrink-0 place-items-center rounded-full shadow-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              aria-label={isSubmitting ? 'Signing in' : 'Sign in'}
              disabled={isSubmitting}
            >
              <img
                className={
                  isSubmitting
                    ? 'size-[clamp(2.25rem,3vw,3.75rem)] animate-pulse'
                    : 'size-[clamp(2.25rem,3vw,3.75rem)]'
                }
                src={loginButtonIcon}
                alt=""
                aria-hidden="true"
              />
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
