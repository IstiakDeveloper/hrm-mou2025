import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

<<<<<<< HEAD
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
=======
type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: ProgressProps) {
>>>>>>> feature/flutter-mobile-app
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
<<<<<<< HEAD
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
=======
        "bg-muted relative w-full overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10",
>>>>>>> feature/flutter-mobile-app
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
<<<<<<< HEAD
        className="bg-primary h-full w-full flex-1 transition-all"
=======
        className={cn(
          "relative h-full w-full flex-1 transition-all",
          "bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.35)_inset] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.2)_inset]",
          // premium stripe overlay
          "after:pointer-events-none after:absolute after:inset-0 after:opacity-25",
          "after:bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.55)_0px,rgba(255,255,255,0.55)_8px,rgba(255,255,255,0.05)_8px,rgba(255,255,255,0.05)_16px)]",
          indicatorClassName
        )}
>>>>>>> feature/flutter-mobile-app
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
