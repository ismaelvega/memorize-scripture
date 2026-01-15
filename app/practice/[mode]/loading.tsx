import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </header>
      <div className="px-4 pb-3">
        <Skeleton className="h-4 w-48" />
      </div>
      <main className="flex-1 px-3 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-neutral-200/60 dark:border-neutral-800/70 bg-white dark:bg-neutral-900 p-4 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
