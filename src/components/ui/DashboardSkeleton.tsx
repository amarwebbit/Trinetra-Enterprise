'use client';

import { Skeleton } from './skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Banner Skeleton */}
      <Skeleton variant="card" height={120} className="w-full" />

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" height={90} />
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton variant="card" height={320} />
        </div>
        <div className="lg:col-span-1">
          <Skeleton variant="card" height={320} />
        </div>
      </div>
    </div>
  );
}
