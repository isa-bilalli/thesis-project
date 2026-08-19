interface ModulePlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
}

export function ModulePlaceholderPage({
  eyebrow,
  title,
  description,
}: ModulePlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="border-b border-zinc-800 pb-7">
        <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-300">
          This workspace is ready for its module implementation.
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          The shared navigation, authentication, and permission guard are already active here.
        </p>
      </section>
    </div>
  )
}
