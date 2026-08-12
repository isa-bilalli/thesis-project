import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { usePlatformAuth } from '../hooks/usePlatformAuth'

export function PlatformProtectedRoute() {
  const location = useLocation()
  const { status } = usePlatformAuth()

  if (status === 'initializing') {
    return <FullPageLoader />
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/platform/login"
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}
