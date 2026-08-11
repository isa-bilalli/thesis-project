export function FullPageLoader() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3" role="status" aria-live="polite">
        <span className="size-5 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" />
        <span className="text-sm font-medium">Restoring your session…</span>
      </div>
    </main>
  )
}
