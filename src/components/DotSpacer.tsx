import {cn} from "~lib/utils";

export function DotSpacer({ className }: { className?: string }) {
  return (
    <>
      <div color="gray" className={cn("size-1.5 mx-1 bg-gray11 rounded-full", className)}></div>
    </>
  );
}

export function DotSpacerSmall({ className }: { className?: string }) {
  return (
    <>
      <div color="gray" className={cn("size-1 mx-1 bg-gray11 rounded-full", className)}></div>
    </>
  );
}
