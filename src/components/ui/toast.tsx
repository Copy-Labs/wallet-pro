import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "~/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "sc-fixed sc-top-0 sc-z-[100] sc-flex sc-max-h-screen sc-w-full sc-flex-col-reverse sc-p-4 sm:sc-bottom-0 sm:sc-right-0 sm:sc-top-auto sm:sc-flex-col md:sc-max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "sc-group sc-pointer-events-auto sc-relative sc-flex sc-w-full sc-items-center sc-justify-between sc-space-x-2 sc-overflow-hidden sc-rounded-md sc-border sc-p-4 sc-pr-6 sc-shadow-lg sc-transition-all data-[swipe=cancel]:sc-translate-x-0 data-[swipe=end]:sc-translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:sc-translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:sc-transition-none data-[state=open]:sc-animate-in data-[state=closed]:sc-animate-out data-[swipe=end]:sc-animate-out data-[state=closed]:sc-fade-out-80 data-[state=closed]:sc-slide-out-to-right-full data-[state=open]:sc-slide-in-from-top-full data-[state=open]:sm:sc-slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "sc-border sc-bg-background sc-text-foreground",
        destructive:
          "sc-destructive sc-group sc-border-destructive sc-bg-destructive sc-text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "sc-inline-flex sc-h-8 sc-shrink-0 sc-items-center sc-justify-center sc-rounded-md sc-border sc-bg-transparent sc-px-3 sc-text-sm sc-font-medium sc-transition-colors hover:sc-bg-secondary focus:sc-outline-none focus:sc-ring-1 focus:sc-ring-ring disabled:sc-pointer-events-none disabled:sc-opacity-50 group-[.destructive]:sc-border-muted/40 group-[.destructive]:hover:sc-border-destructive/30 group-[.destructive]:hover:sc-bg-destructive group-[.destructive]:hover:sc-text-destructive-foreground group-[.destructive]:focus:sc-ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "sc-absolute sc-right-1 sc-top-1 sc-rounded-md sc-p-1 sc-text-foreground/50 sc-opacity-0 sc-transition-opacity hover:sc-text-foreground focus:sc-opacity-100 focus:sc-outline-none focus:sc-ring-1 group-hover:sc-opacity-100 group-[.destructive]:sc-text-red-300 group-[.destructive]:hover:sc-text-red-50 group-[.destructive]:focus:sc-ring-red-400 group-[.destructive]:focus:sc-ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="sc-h-4 sc-w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("sc-text-sm sc-font-semibold [&+div]:sc-text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("sc-text-sm sc-opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
