import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="rounded-3xl border border-white/50 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-3 pb-3">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2 w-24 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
