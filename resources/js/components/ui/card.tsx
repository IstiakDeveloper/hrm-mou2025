import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
<<<<<<< HEAD
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
=======
        "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col gap-6 rounded-xl border border-slate-300/90 dark:border-slate-700 py-6 shadow-sm hover:shadow-md transition-shadow",
>>>>>>> feature/flutter-mobile-app
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
<<<<<<< HEAD
      className={cn("leading-none font-semibold", className)}
=======
      className={cn("leading-none font-bold text-slate-900 dark:text-white tracking-tight", className)}
>>>>>>> feature/flutter-mobile-app
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
<<<<<<< HEAD
      className={cn("text-muted-foreground text-sm", className)}
=======
      className={cn("text-slate-600 dark:text-slate-400 text-sm font-medium", className)}
>>>>>>> feature/flutter-mobile-app
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
