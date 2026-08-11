import { useAuth } from '@/features/auth/hooks/useAuth'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <section>
      <p className="text-sm font-medium text-sky-400">Overview</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">
        Welcome, {user?.firstName ?? 'team member'}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        Your protected application shell is ready. Add dashboard widgets or register
        another feature page in the central route table.
      </p>
    </section>
  )
}
