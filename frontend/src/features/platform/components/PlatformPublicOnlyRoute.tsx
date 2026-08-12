import { Navigate, Outlet } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { usePlatformAuth } from '../hooks/usePlatformAuth'

export function PlatformPublicOnlyRoute() {
  const { status } = usePlatformAuth()

  if (status === 'initializing') {
    return <FullPageLoader />
  }

  if (status === 'authenticated') {
    return <Navigate to="/platform/dashboard" replace />
  }

  return <Outlet />
}
