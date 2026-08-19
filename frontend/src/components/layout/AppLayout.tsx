import { Outlet } from 'react-router-dom'
import { Navbar } from '@/features/dashboard/components/Navbar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 scheme-dark">
      <Navbar />
      <main className="min-w-0 flex-1 overflow-x-hidden pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
