import { Skeleton } from '@/components/ui/skeleton';

export default function NewScanLoading() {
  return (
    <>
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-16">
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Title */}
        <div className="mb-6">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="space-y-6">
          {/* Query Input */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="p-4 rounded-xl border-2 border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary and Submit */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
