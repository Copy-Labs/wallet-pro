import React, {type ReactNode, useState} from "react"
import { Plus } from "lucide-react"
import { Input } from "~components/ui/input"
import { Button, Dialog, Flex, TextField } from "@radix-ui/themes"
import { Label } from "~components/ui/label"
import type { WalletAccount } from "~/types/account"
import {toast} from "sonner";

interface CreateAccountDialogProps {
  triggerLabel: string
  triggerChildren?: ReactNode
  description?: string
  placeholder?: string
  onCreateAccount?: (accountName: string) => Promise<void>
  onSuccess?: (account: WalletAccount) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateAccountDialog({
  triggerChildren,
  triggerLabel,
  description,
  placeholder,
  onCreateAccount,
  onSuccess,
  open,
  onOpenChange
}: CreateAccountDialogProps) {
  const [newAccountName, setNewAccountName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return

    setIsCreating(true)
    try {
      if (onCreateAccount) {
        // Use provided callback (controlled mode)
        await onCreateAccount(newAccountName)
        setNewAccountName("")
        onOpenChange?.(false)
      } else {
        // Self-contained mode - handle everything internally
        const { createSmartAccount } = await import("~/services/wallet")
        const { getSelectedNetwork } = await import("~/utils/storage")
        const { getChainById, defaultChain } = await import("~/config/chains")

        const chainId = await getSelectedNetwork()
        const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain

        const account = await createSmartAccount(newAccountName, chain)

        // Success feedback
        toast.success(`${account.name} created successfully!`);

        // Call success callback if provided
        onSuccess?.(account)

        // Dispatch custom event for global state updates
        window.dispatchEvent(new CustomEvent('accountCreated', { detail: account }))

        setNewAccountName("")
        onOpenChange?.(false)
      }
    } catch (error) {
      console.error("Error creating account:", error)
      alert(`Failed to create account: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleCreateAccount()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger>
        {triggerChildren
          ? triggerChildren
          : (
            <Button highContrast variant="solid">
              <Plus size={16} strokeWidth={4} />
              {triggerLabel}
            </Button>
          )
        }
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Create Smart Account</Dialog.Title>
        {description && <Dialog.Description>
          {description}
        </Dialog.Description>}
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Account Name</Label>
            {/*<Input
              id="name"
              placeholder="e.g., Trading Account"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={handleKeyDown}
            />*/}
            <TextField.Root
              id="name"
              placeholder={placeholder || "e.g., Trading Account"}
              size="2"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button
              type="button"
              variant="solid"
              disabled={isCreating}>
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button
              color="grass"
              type="submit"
              onClick={handleCreateAccount}
              disabled={isCreating || !newAccountName.trim()}>
              {isCreating ? "Creating..." : "Create Account"}
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
