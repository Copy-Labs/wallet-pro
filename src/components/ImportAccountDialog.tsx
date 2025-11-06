import React from "react"
import { Import } from "lucide-react"
import { Button, Dialog } from "@radix-ui/themes"
import type { WalletAccount } from "~/types/account"
import { ImportAccountForm } from "./ImportAccountForm"

interface ImportAccountDialogProps {
  triggerLabel: string
  triggerChildren?: React.ReactNode
  onImportSuccess?: (accounts: WalletAccount[]) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ImportAccountDialog({
  triggerChildren,
  triggerLabel,
  onImportSuccess,
  open,
  onOpenChange
}: ImportAccountDialogProps) {
  const handleImportSuccess = (accounts: WalletAccount[]) => {
    onImportSuccess?.(accounts)
    onOpenChange?.(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        {triggerChildren || (
          <Button variant="soft" color="blue">
            <Import size={16} />
            {triggerLabel}
          </Button>
        )}
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Import Wallet</Dialog.Title>
        <ImportAccountForm
          onImportSuccess={handleImportSuccess}
          showCancelButton={false}
        />
      </Dialog.Content>
    </Dialog.Root>
  )
}
