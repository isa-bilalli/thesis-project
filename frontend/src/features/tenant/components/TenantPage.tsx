import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/lib/api/api-client'
import type { Customer, Pagination } from '../types/tenant-domain'

export const inputClassName =
  'mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50'
export const lightInputClassName =
  'mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-zinc-400 focus:border-zinc-600 disabled:opacity-50'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-zinc-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      {action}
    </header>
  )
}

export function FeedbackMessage({
  error,
  success,
}: {
  error?: string | null
  success?: string | null
}) {
  if (!error && !success) return null
  return (
    <p
      className={`mt-6 rounded-xl border p-4 text-sm ${
        error
          ? 'border-red-400/20 bg-red-400/10 text-red-200'
          : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
      }`}
      role={error ? 'alert' : 'status'}
    >
      {error ?? success}
    </p>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const positive = ['ACTIVE', 'AVAILABLE', 'COMPLETED', 'WON', 'CUSTOMER', 'ACCEPTED'].includes(status)
  const warning = ['PENDING', 'RESERVED', 'SCHEDULED', 'IN_PROGRESS', 'SENT', 'PROSPECT', 'QUALIFIED'].includes(status)
  const negative = ['DISABLED', 'INACTIVE', 'CANCELLED', 'LOST', 'REJECTED', 'EXPIRED', 'NO_SHOW'].includes(status)
  const className = positive
    ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20'
    : warning
      ? 'bg-amber-400/10 text-amber-300 ring-amber-400/20'
      : negative
        ? 'bg-red-400/10 text-red-300 ring-red-400/20'
        : 'bg-zinc-800 text-zinc-400 ring-zinc-700'

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${className}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function PaginationControls({
  pagination,
  onPage,
}: {
  pagination: Pagination
  onPage: (page: number) => void
}) {
  if (pagination.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-4 text-xs text-zinc-500">
      <p>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
      </p>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-zinc-800 px-3 py-2 disabled:opacity-40"
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          Previous
        </button>
        <button
          className="rounded-lg border border-zinc-800 px-3 py-2 disabled:opacity-40"
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPage(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mt-2 text-xs text-zinc-600">{description}</p>
      {actionLabel && actionTo ? (
        <Link className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function customerName(customer: Pick<Customer, 'customerType' | 'firstName' | 'lastName' | 'companyName'>): string {
  return customer.customerType === 'BUSINESS'
    ? customer.companyName ?? 'Business customer'
    : `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Individual customer'
}

// eslint-disable-next-line react-refresh/only-export-components
export function referenceCustomerName(customer: Pick<Customer, 'firstName' | 'lastName' | 'companyName'>): string {
  return (
    customer.companyName ??
    (`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || 'Customer')
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatDate(value: string | null | undefined, includeTime = false): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatCurrency(value: string | number | null | undefined, currency = 'EUR'): string {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

// eslint-disable-next-line react-refresh/only-export-components
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}
