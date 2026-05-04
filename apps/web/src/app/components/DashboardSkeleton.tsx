export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <main className="editorial-container" style={{ paddingTop: '48px' }}>
        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-3 w-24 animate-pulse" style={{ background: '#141414' }} />
          <div className="h-8 w-64 animate-pulse mt-4" style={{ background: '#141414' }} />
        </div>

        {/* Streak band skeleton */}
        <div className="animate-pulse" style={{ borderBottom: '1px solid #262626', paddingBottom: '32px', marginBottom: '32px' }}>
          <div className="flex items-center gap-8">
            <div>
              <div className="h-12 w-20" style={{ background: '#141414' }} />
              <div className="h-3 w-16 mt-2" style={{ background: '#141414' }} />
            </div>
            <div>
              <div className="h-12 w-16" style={{ background: '#141414' }} />
              <div className="h-3 w-12 mt-2" style={{ background: '#141414' }} />
            </div>
          </div>
        </div>

        {/* Mission card skeleton */}
        <div className="animate-pulse mb-10" style={{ background: '#141414', border: '1px solid #262626', borderTop: '2px solid #8b5cf6', padding: '24px' }}>
          <div className="h-3 w-32 mb-4" style={{ background: '#262626' }} />
          <div className="h-5 w-full max-w-md mb-2" style={{ background: '#262626' }} />
          <div className="h-4 w-3/4 mb-6" style={{ background: '#1f1f1f' }} />
          <div className="flex gap-3">
            <div className="h-11 w-32" style={{ background: '#262626', borderRadius: '9999px' }} />
            <div className="h-11 w-36" style={{ background: '#1f1f1f', borderRadius: '9999px' }} />
          </div>
        </div>

        {/* Feature grid skeleton */}
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: '#262626' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ background: '#141414', padding: '24px' }}>
              <div className="h-4 w-20 mb-2" style={{ background: '#262626' }} />
              <div className="h-3 w-32" style={{ background: '#1f1f1f' }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
