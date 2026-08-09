import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all overflow-hidden shadow-xs",
  {
    variants: {
      variant: {
        default:
          "border-emerald-600 bg-emerald-600 text-white font-bold [a&]:hover:bg-emerald-700",
        secondary:
          "border-slate-300 bg-slate-100 text-slate-800 font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 [a&]:hover:bg-slate-200",
        destructive:
          "border-red-600 bg-red-600 text-white font-bold [a&]:hover:bg-red-700",
        outline:
          "border-slate-400 bg-white text-slate-900 font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 [a&]:hover:bg-slate-100",
        success:
          "border-emerald-300 bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800",
        warning:
          "border-amber-300 bg-amber-100 text-amber-950 font-bold dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800",
        info:
          "border-sky-300 bg-sky-100 text-sky-950 font-bold dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
