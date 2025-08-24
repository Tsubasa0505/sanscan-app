export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
        >
          <div className="flex items-start space-x-4">
            {/* Avatar skeleton */}
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            
            <div className="flex-1 space-y-2">
              {/* Name skeleton */}
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              
              {/* Company skeleton */}
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              
              {/* Details skeleton */}
              <div className="space-y-1 pt-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
            
            {/* Actions skeleton */}
            <div className="flex space-x-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-3">
        <div className="flex space-x-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
        </div>
      </div>
      
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i}
          className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 animate-pulse"
        >
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6" />
          </div>
        </div>
      ))}
    </div>
  );
}