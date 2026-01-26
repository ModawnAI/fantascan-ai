import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <>
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Title */}
        <div className="mb-6">
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 border border-white/10 rounded-xl">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Brand Settings Section */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-red-400/20 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
