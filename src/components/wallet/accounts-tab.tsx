import React, { useState, useEffect } from "react"
import { Wallet, Plus, Check, Copy, MoreVertical } from "lucide-react"
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
import { Button } from "@radix-ui/themes"
import { formatAddress, formatBalance } from "~utils"
import { AccountList } from "~components/AccountList"
import { CreateAccountDialog } from "~components/CreateAccountDialog"
import { useAccounts, useActiveAccount } from "~/store/ui-store"

export function AccountsTab() {
  const accounts = useAccounts()
  const activeAccount = useActiveAccount()
  const activeAccountId = activeAccount?.id || null
  const [balances, setBalances] = useState<Map<string, AccountBalance>>(new Map())
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Load balances when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      loadBalances()
    }
  }, [accounts])

  // Listen for network changes to refresh balances
  useEffect(() => {
    const handleNetworkChange = () => {
      if (accounts.length > 0) {
        loadBalances()
      }
    }

    window.addEventListener('networkChanged', handleNetworkChange)
    return () => window.removeEventListener('networkChanged', handleNetworkChange)
  }, [accounts])

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

  const handleSwitchAccount = async (accountId: string) => {
    try {
      await switchAccount(accountId)
    } catch (error) {
      console.error("Error switching account:", error)
    }
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Wallet className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Accounts Yet</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Create your first smart account to get started
        </p>

        <CreateAccountDialog
          triggerLabel="Create Account"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Account List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <AccountList accounts={accounts} />

        {/*{accounts.map((account) => {
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
        })}*/}
      </div>

      {/* Create Account Button */}
      {/*<div className="p-4">
        <CreateAccountDialog
          triggerLabel={accounts.length > 0 ? "Add New Address" : "Create New Account"}
        />
      </div>*/}
    </div>
  )
}
