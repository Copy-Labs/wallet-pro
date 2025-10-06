import React, { useState, useEffect } from "react"
import { Wallet, Plus, Check, Copy, MoreVertical } from "lucide-react"
import { Input } from "~components/ui/input"
import type { WalletAccount, AccountBalance } from "~/types/account"
import {
  createSmartAccount,
  getAllAccounts,
  switchAccount,
  getActiveAccount,
} from "~/services/wallet"
import { fetchAccountBalance } from "~/services/balance"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import {Button, Dialog, Flex} from "@radix-ui/themes"
import {Label} from "~components/ui/label";

export function AccountsTab() {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [balances, setBalances] = useState<Map<string, AccountBalance>>(new Map())
  const [isCreating, setIsCreating] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Load accounts and active account
  useEffect(() => {
    loadAccounts()
  }, [])

  // Load balances when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      loadBalances()
    }
  }, [accounts])

  const loadAccounts = async () => {
    try {
      const allAccounts = await getAllAccounts()
      const active = await getActiveAccount()
      setAccounts(allAccounts)
      setActiveAccountId(active?.id || null)
    } catch (error) {
      console.error("Error loading accounts:", error)
    }
  }

  const loadBalances = async () => {
    try {
      const chainId = await getSelectedNetwork()
      const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain

      const newBalances = new Map<string, AccountBalance>()

      for (const account of accounts) {
        const balance = await fetchAccountBalance(account.address, chain)
        newBalances.set(account.id, balance)
      }

      setBalances(newBalances)
    } catch (error) {
      console.error("Error loading balances:", error)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return

    setIsCreating(true)
    try {
      const chainId = await getSelectedNetwork()
      const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain

      await createSmartAccount(newAccountName, chain)
      await loadAccounts()

      setNewAccountName("")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error creating account:", error)
      alert(`Failed to create account: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSwitchAccount = async (accountId: string) => {
    try {
      await switchAccount(accountId)
      setActiveAccountId(accountId)
    } catch (error) {
      console.error("Error switching account:", error)
    }
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num === 0) return "0.0000"
    if (num < 0.0001) return "< 0.0001"
    return num.toFixed(4)
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Wallet className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Accounts Yet</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Create your first smart account to get started
        </p>

        <Dialog.Root
          // open={isDialogOpen}
          // onOpenChange={setIsDialogOpen}
        >
          <Dialog.Trigger>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>
              <Dialog.Title>Create Smart Account</Dialog.Title>
              <Dialog.Description>
                Create a new Alchemy Smart Account with gas sponsorship
              </Dialog.Description>
            </Dialog.Title>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Account"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAccount()
                  }}
                />
              </div>
            </div>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isCreating}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Dialog.Close>
                <Button
                  color={'grass'}
                  type="submit"
                  onClick={handleCreateAccount}
                  disabled={isCreating || !newAccountName.trim()}>
                  {isCreating ? "Creating..." : "Create Account"}
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Account List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {accounts.map((account) => {
          const balance = balances.get(account.id)
          const isActive = account.id === activeAccountId

          return (
            <div
              key={account.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? "bg-accent border-accent-foreground/20"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => handleSwitchAccount(account.id)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{account.name}</span>
                  {isActive && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyAddress(account.address)
                  }}>
                  {formatAddress(account.address)}
                  {copiedAddress === account.address ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                <div className="text-right">
                  <div className="font-semibold">
                    {balance ? formatBalance(balance.eth) : "..."} ETH
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Account Button */}
      <div className="border-t p-4">
        <Dialog.Root
          // open={isDialogOpen} onOpenChange={setIsDialogOpen}
        >
          <Dialog.Trigger>
            <Button className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2"/>
              Create New Account
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Title>Create Smart Account</Dialog.Title>
            <Dialog.Description>
              Create a new Alchemy Smart Account with gas sponsorship
            </Dialog.Description>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Trading Account"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAccount()
                  }}
                />
              </div>
            </div>
            <Dialog.Close>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isCreating}>
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleCreateAccount}
                disabled={isCreating || !newAccountName.trim()}>
                {isCreating ? "Creating..." : "Create Account"}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Root>

        <iframe src="http://localhost:3002/embed?fdb=K4Tg527GhCbDNWM14wyEyg" width="400" height="7"
                frameBorder="0"></iframe>
      </div>
    </div>
  )
}
