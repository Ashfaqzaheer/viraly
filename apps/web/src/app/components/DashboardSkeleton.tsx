export default function DashboardSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-9 w-72 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-56 rounded-lg bg-white/[0.04] animate-pulse mt-3" />
        </div>

        {/* Mission card skeleton */}
        <div className="glass-strong rounded-2xl p-6 mb-6 animate-pulse border border-white/[0.05]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded bg-white/[0.06]" />
                <div className="h-4 w-28 rounded bg-white/[0.06]" />
              </div>
              <div className="h-6 w-full max-w-md rounded bg-white/[0.05] mb-2" />
              <div className="h-4 w-3/4 rounded bg-white/[0.04]" />
            </div>
            <div className="text-center shrink-0 ml-4">
              <div className="h-8 w-8 rounded bg-white/[0.06] mx-auto mb-1" />
              <div className="h-3 w-12 rounded bg-white/[0.04]" />
            </div>
          </div>
          {/* Reward progress bar */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1">
                <div className="h-1.5 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-8 rounded bg-white/[0.04] mx-auto mt-1" />
              </div>
            ))}
          </div>
          {/* Buttons */}
          <div className="flex gap-3">
            <div className="h-10 w-36 rounded-xl bg-white/[0.06]" />
            <div className="h-10 w-36 rounded-xl bg-white/[0.04]" />
          </div>
        </div>

        {/* Feature cards grid skeleton */}
        <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-[140px] border border-white/[0.05] animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="h-10 w-10 rounded-xl bg-white/[0.04] mb-3" />
              <div className="h-4 w-20 rounded bg-white/[0.06] mb-2" />
              <div className="h-3 w-32 rounded bg-white/[0.03]" />
            </div>
          ))}
        </nav>
      </main>
    </div>
  )
}
