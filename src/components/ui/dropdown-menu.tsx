import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "~/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuGroup = DropdownMenuPrimitive.Group

const DropdownMenuPortal = DropdownMenuPrimitive.Portal

const DropdownMenuSub = DropdownMenuPrimitive.Sub

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "sc-flex sc-cursor-default sc-select-none sc-items-center sc-gap-2 sc-rounded-sm sc-px-2 sc-py-1.5 sc-text-sm sc-outline-none focus:sc-bg-accent data-[state=open]:sc-bg-accent [&_svg]:sc-pointer-events-none [&_svg]:sc-size-4 [&_svg]:sc-shrink-0",
      inset && "sc-pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="sc-ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "sc-z-50 sc-min-w-[8rem] sc-overflow-hidden sc-rounded-md sc-border sc-bg-popover sc-p-1 sc-text-popover-foreground sc-shadow-lg data-[state=open]:sc-animate-in data-[state=closed]:sc-animate-out data-[state=closed]:sc-fade-out-0 data-[state=open]:sc-fade-in-0 data-[state=closed]:sc-zoom-out-95 data-[state=open]:sc-zoom-in-95 data-[side=bottom]:sc-slide-in-from-top-2 data-[side=left]:sc-slide-in-from-right-2 data-[side=right]:sc-slide-in-from-left-2 data-[side=top]:sc-slide-in-from-bottom-2 sc-origin-[--radix-dropdown-menu-content-transform-origin]",
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "sc-z-50 sc-max-h-[var(--radix-dropdown-menu-content-available-height)] sc-min-w-[8rem] sc-overflow-y-auto sc-overflow-x-hidden sc-rounded-md sc-border sc-bg-popover sc-p-1 sc-text-popover-foreground sc-shadow-md",
        "data-[state=open]:sc-animate-in data-[state=closed]:sc-animate-out data-[state=closed]:sc-fade-out-0 data-[state=open]:sc-fade-in-0 data-[state=closed]:sc-zoom-out-95 data-[state=open]:sc-zoom-in-95 data-[side=bottom]:sc-slide-in-from-top-2 data-[side=left]:sc-slide-in-from-right-2 data-[side=right]:sc-slide-in-from-left-2 data-[side=top]:sc-slide-in-from-bottom-2 sc-origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "sc-relative sc-flex sc-cursor-default sc-select-none sc-items-center sc-gap-2 sc-rounded-sm sc-px-2 sc-py-1.5 sc-text-sm sc-outline-none sc-transition-colors focus:sc-bg-accent focus:sc-text-accent-foreground data-[disabled]:sc-pointer-events-none data-[disabled]:sc-opacity-50 [&>svg]:sc-size-4 [&>svg]:sc-shrink-0",
      inset && "sc-pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "sc-relative sc-flex sc-cursor-default sc-select-none sc-items-center sc-rounded-sm sc-py-1.5 sc-pl-8 sc-pr-2 sc-text-sm sc-outline-none sc-transition-colors focus:sc-bg-accent focus:sc-text-accent-foreground data-[disabled]:sc-pointer-events-none data-[disabled]:sc-opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="sc-absolute sc-left-2 sc-flex sc-h-3.5 sc-w-3.5 sc-items-center sc-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="sc-h-4 sc-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "sc-relative sc-flex sc-cursor-default sc-select-none sc-items-center sc-rounded-sm sc-py-1.5 sc-pl-8 sc-pr-2 sc-text-sm sc-outline-none sc-transition-colors focus:sc-bg-accent focus:sc-text-accent-foreground data-[disabled]:sc-pointer-events-none data-[disabled]:sc-opacity-50",
      className
    )}
    {...props}
  >
    <span className="sc-absolute sc-left-2 sc-flex sc-h-3.5 sc-w-3.5 sc-items-center sc-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="sc-h-2 sc-w-2 sc-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "sc-px-2 sc-py-1.5 sc-text-sm sc-font-semibold",
      inset && "sc-pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("sc--mx-1 sc-my-1 sc-h-px sc-bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("sc-ml-auto sc-text-xs sc-tracking-widest sc-opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
