import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "~/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "sc-peer sc-inline-flex sc-h-5 sc-w-9 sc-shrink-0 sc-cursor-pointer sc-items-center sc-rounded-full sc-border-2 sc-border-transparent sc-shadow-sm sc-transition-colors focus-visible:sc-outline-none focus-visible:sc-ring-2 focus-visible:sc-ring-ring focus-visible:sc-ring-offset-2 focus-visible:sc-ring-offset-background disabled:sc-cursor-not-allowed disabled:sc-opacity-50 data-[state=checked]:sc-bg-primary data-[state=unchecked]:sc-bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "sc-pointer-events-none sc-block sc-h-4 sc-w-4 sc-rounded-full sc-bg-background sc-shadow-lg sc-ring-0 sc-transition-transform data-[state=checked]:sc-translate-x-4 data-[state=unchecked]:sc-translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
