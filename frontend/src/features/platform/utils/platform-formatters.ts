import type {
  TenantStatus,
  TenantUserStatus,
} from '../types/platform-tenant'

export function formatPlatformDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function tenantStatusClass(status: TenantStatus): string {
  if (status === 'ACTIVE') {
    return 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20'
  }

  if (status === 'SUSPENDED') {
    return 'bg-amber-400/10 text-amber-400 ring-amber-400/20'
  }

  return 'bg-zinc-800 text-zinc-400 ring-zinc-700'
}

export function userStatusClass(status: TenantUserStatus): string {
  return status === 'ACTIVE'
    ? 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20'
    : 'bg-zinc-800 text-zinc-400 ring-zinc-700'
}
