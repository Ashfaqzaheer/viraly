export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-9 w-72 bg-surface-card animate-pulse" />
          <div className="h-4 w-56 bg-surface-soft animate-pulse mt-3" />
        </div>

        {/* Streak band skeleton */}
        <div className="bg-surface-soft border border-hairline border-t-4 border-t-accent p-6 mb-6 animate-pulse">
          <div className="flex items-center gap-6">
            <div className="h-10 w-16 bg-surface-card" />
            <div className="h-10 w-px bg-hairline" />
            <div className="h-10 w-16 bg-surface-card" />
          </div>
        </div>

        {/* Mission card skeleton */}
        <div className="card-elevated mb-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 bg-surface-soft" />
                <div className="h-4 w-28 bg-surface-soft" />
              </div>
              <div className="h-6 w-full max-w-md bg-surface-card mb-2" />
              <div className="h-4 w-3/4 bg-surface-soft" />
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-3">
            <div className="h-12 w-36 bg-surface-card border border-hairline" />
            <div className="h-12 w-36 bg-surface-soft border border-hairline" />
          </div>
        </div>

        {/* Feature cards grid skeleton */}
        <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-[140px] animate-pulse">
              <div className="h-10 w-10 bg-surface-soft mb-3" />
              <div className="h-4 w-20 bg-surface-card mb-2" />
              <div className="h-3 w-32 bg-surface-soft" />
            </div>
          ))}
        </nav>
      </main>
    </div>
  )
}
