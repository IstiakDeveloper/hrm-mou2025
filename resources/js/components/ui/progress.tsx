import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-muted relative w-full overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "relative h-full w-full flex-1 transition-all",
          "bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.35)_inset] dark:shadow-[0_0_0_1px_rgba(0,0,0,0.2)_inset]",
          // premium stripe overlay
          "after:pointer-events-none after:absolute after:inset-0 after:opacity-25",
          "after:bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.55)_0px,rgba(255,255,255,0.55)_8px,rgba(255,255,255,0.05)_8px,rgba(255,255,255,0.05)_16px)]",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
