import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

const alertVariants = cva(
  "sc-relative sc-w-full sc-rounded-lg sc-border sc-px-4 sc-py-3 sc-text-sm [&>svg+div]:sc-translate-y-[-3px] [&>svg]:sc-absolute [&>svg]:sc-left-4 [&>svg]:sc-top-4 [&>svg]:sc-text-foreground [&>svg~*]:sc-pl-7",
  {
    variants: {
      variant: {
        default: "sc-bg-background sc-text-foreground",
        destructive:
          "sc-border-destructive/50 sc-text-destructive dark:sc-border-destructive [&>svg]:sc-text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("sc-mb-1 sc-font-medium sc-leading-none sc-tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("sc-text-sm [&_p]:sc-leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
