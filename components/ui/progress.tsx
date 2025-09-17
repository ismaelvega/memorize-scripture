import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
}

export function Progress({ value, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value ?? 0))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800",
        className
      )}
      {...props}
    >
      <div className="h-full w-full flex-1">
        <div
          className="h-full bg-green-500 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

