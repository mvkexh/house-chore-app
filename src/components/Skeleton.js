'use client';

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-24"></div>
        <div className="skeleton h-4 w-16"></div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-6 w-3/4"></div>
        <div className="skeleton h-4 w-1/2"></div>
      </div>
      <div className="skeleton h-16 w-full rounded-xl"></div>
      <div className="flex gap-2">
        <div className="skeleton h-9 flex-1 rounded-xl"></div>
        <div className="skeleton h-9 flex-1 rounded-xl"></div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6 space-y-3">
        <div className="skeleton h-4 w-32"></div>
        <div className="skeleton h-8 w-64"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
