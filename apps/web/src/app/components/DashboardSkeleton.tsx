export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <main className="max-w-6xl mx-auto px-6 pt-10">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-3 w-20 rounded-lg skeleton" />
          <div className="h-8 w-48 rounded-lg skeleton mt-3" />
        </div>

        {/* Streak card skeleton */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="h-16 w-20 rounded-xl skeleton" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 rounded-lg skeleton" />
              <div className="h-3 w-24 rounded-lg skeleton" />
            </div>
          </div>
        </div>

        {/* Mission card skeleton */}
        <div className="glass-strong rounded-2xl p-6 mb-6 border-l-2 border-violet-500/50">
          <div className="h-3 w-28 rounded-lg skeleton mb-4" />
          <div className="h-5 w-full max-w-md rounded-lg skeleton mb-2" />
          <div className="h-4 w-3/4 rounded-lg skeleton mb-6" />
          <div className="flex gap-3">
            <div className="h-11 w-32 rounded-xl skeleton" />
            <div className="h-11 w-36 rounded-xl skeleton" />
          </div>
        </div>

        {/* Feature grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="h-5 w-20 rounded-lg skeleton mb-3" />
              <div className="h-3 w-32 rounded-lg skeleton" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
