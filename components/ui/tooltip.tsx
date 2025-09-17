"use client"
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
        className
      )}
      {...props}
    />
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

