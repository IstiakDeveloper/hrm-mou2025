import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
<<<<<<< HEAD
      className={cn("[&_tr]:border-b", className)}
=======
      className={cn("bg-slate-100/90 dark:bg-slate-800/80 [&_tr]:border-b-2 [&_tr]:border-slate-300 dark:[&_tr]:border-slate-700", className)}
>>>>>>> feature/flutter-mobile-app
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
<<<<<<< HEAD
      className={cn("[&_tr:last-child]:border-0", className)}
=======
      className={cn("[&_tr:last-child]:border-0 divide-y divide-slate-200 dark:divide-slate-800", className)}
>>>>>>> feature/flutter-mobile-app
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
<<<<<<< HEAD
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
=======
        "bg-slate-100 font-semibold text-slate-900 border-t border-slate-300 [&>tr]:last:border-b-0",
>>>>>>> feature/flutter-mobile-app
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
<<<<<<< HEAD
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
=======
        "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 data-[state=selected]:bg-slate-100 border-b border-slate-200/90 dark:border-slate-800 transition-colors",
>>>>>>> feature/flutter-mobile-app
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
<<<<<<< HEAD
        "text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
=======
        "text-slate-900 dark:text-slate-100 h-10 px-3 text-left align-middle font-bold text-xs uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
>>>>>>> feature/flutter-mobile-app
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
<<<<<<< HEAD
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
=======
        "p-3 text-slate-800 dark:text-slate-200 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
>>>>>>> feature/flutter-mobile-app
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
