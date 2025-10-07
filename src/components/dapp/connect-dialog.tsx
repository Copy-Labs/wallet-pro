import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~ComponentsUI/ui/dialog"
import { Button } from "~ComponentsUI/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/themes"
import { CheckCircle, AlertCircle, Wallet } from "lucide-react"
import type { WalletAccount } from "~types/account"

interface ConnectDialogProps {
  isOpen: boolean
  onClose: () => void
  origin: string
  onConnect: (accountId: string) => void
  onReject: () => void
  accounts: WalletAccount[]
}

export function ConnectDialog({
  isOpen,
  onClose,
  origin,
  onConnect,
  onReject,
  accounts
}: ConnectDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

  // Auto-select the first account if available
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  const handleConnect = () => {
    if (selectedAccountId) {
      onConnect(selectedAccountId)
      onClose()
    }
  }

  const handleReject = () => {
    onReject()
    onClose()
  }

  // Extract hostname from origin URL
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const hostname = getHostname(origin)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Connect to dApp</DialogTitle>
              <DialogDescription>
                {hostname} wants to connect to your wallet
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Permissions requested</span>
            </div>
            <ul className="text-sm text-gray-600 ml-6">
              <li>• View your Ethereum account address</li>
              <li>• Request approval for transactions</li>
              <li>• Request approval for messages</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Select Account</h3>
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccountId === account.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {account.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{account.name}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {account.address.slice(0, 6)}...{account.address.slice(-4)}
                      </p>
                    </div>
                    {selectedAccountId === account.id && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleReject} className="flex-1">
            Reject
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!selectedAccountId}
            className="flex-1"
          >
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
