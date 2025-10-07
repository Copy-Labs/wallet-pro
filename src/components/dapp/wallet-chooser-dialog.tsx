import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~ComponentsUI/ui/dialog"
import { Button } from "~ComponentsUI/ui/button"
import { Badge } from "@radix-ui/themes"
import { Wallet, Sparkles, ChevronRight, Star } from "lucide-react"

interface WalletOption {
  id: string
  name: string
  description: string
  features: string[]
  recommended?: boolean
  icon?: React.ReactNode
}

interface WalletChooserDialogProps {
  isOpen: boolean
  onClose: () => void
  origin: string
  onSelectWallet: (walletId: string) => void
  otherWalletsDetected?: string[]
}

const baseWalletOptions: WalletOption[] = [
  {
    id: 'smart-wallet-pro',
    name: 'Smart Wallet Pro',
    description: 'AI-powered wallet with gas sponsorship',
    features: [
      'Pay $0 gas for transactions < $1',
      'Smart accounts with advanced features',
      'Built-in transaction history & analytics'
    ],
    recommended: true,
    icon: <Sparkles className="h-8 w-8 text-green-600" />
  },
  {
    id: 'other-wallets',
    name: 'Other Wallets',
    description: 'Use your existing wallet',
    features: [
      'MetaMask, Coinbase Wallet, etc.',
      'Continue with what you\'re familiar with',
      'Access your current accounts'
    ],
    icon: <Wallet className="h-8 w-8 text-gray-600" />
  }
]

export function WalletChooserDialog({
  isOpen,
  onClose,
  origin,
  onSelectWallet,
  otherWalletsDetected = []
}: WalletChooserDialogProps) {
  // Create dynamic wallet options including detected wallets
  const walletOptions = React.useMemo(() => {
    const dynamicOptions = [...baseWalletOptions]

    // Add detected wallets to the "Other Wallets" option
    if (otherWalletsDetected.length > 0) {
      const otherWalletOption = dynamicOptions.find(opt => opt.id === 'other-wallets')
      if (otherWalletOption) {
        otherWalletOption.description = `Found: ${otherWalletsDetected.join(', ')}`
      }
    }

    return dynamicOptions
  }, [otherWalletsDetected])

  const handleSelectWallet = (walletId: string) => {
    onSelectWallet(walletId)
    onClose()
  }

  // Extract hostname from origin URL
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const hostname = getHostname(origin)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Wallet className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Choose Your Wallet
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            {hostname} wants to connect to a wallet
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-4">
            {walletOptions.map((wallet) => (
              <div
                key={wallet.id}
                className={`relative border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  wallet.recommended
                    ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-300'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectWallet(wallet.id)}
              >
                {wallet.recommended && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200 px-2 py-1 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Recommended
                    </Badge>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  {/* Wallet Icon */}
                  <div className="flex-shrink-0">
                    {wallet.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Wallet Name and Description */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {wallet.name}
                      </h3>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {wallet.description}
                    </p>

                    {/* Features List */}
                    <ul className="mt-3 space-y-1">
                      {wallet.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-500 flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Hover indicator */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent hover:border-blue-500 transition-colors duration-200 pointer-events-none" />
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 text-center">
              💡 <strong>Tip:</strong> Your choice will be remembered for this site. You can change it anytime in settings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
