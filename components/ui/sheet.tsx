"use client"
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-black/30", className)}
      {...props}
    />
  )
}

function SheetContent({ className, side = "right", children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" | "top" | "bottom" }) {
  const sideClasses = {
    right: "right-0 top-0 h-full w-80 border-l",
    left: "left-0 top-0 h-full w-80 border-r",
    top: "top-0 left-0 w-full h-80 border-b",
    bottom: "bottom-0 left-0 w-full h-80 border-t",
  } as const
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 bg-background p-6 shadow-lg transition-all border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-neutral-600 dark:text-neutral-400", className)} {...props} />
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}

