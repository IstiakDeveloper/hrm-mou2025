import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 flex h-10 w-full min-w-0 rounded-md border px-3 py-1.5 text-base shadow-xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-medium",
        "focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
        "aria-invalid:ring-red-500/20 aria-invalid:border-red-600",
        className
      )}
      {...props}
    />
  )
}

export { Input }
