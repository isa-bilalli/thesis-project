import { Navigate, Outlet } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { useAuth } from '../hooks/useAuth'

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'initializing') {
    return <FullPageLoader />
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
