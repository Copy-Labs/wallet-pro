import React from "react"
import { Lock } from "lucide-react"
import { Button } from "~components/ui/button"
import { NetworkSelector } from "~components/network-selector"
import { hasSeedPhrase } from "~services/recovery"
import { lockWallet } from "~services/security"
import {Heading} from "@radix-ui/themes";

interface WalletHeaderProps {
  title: string
  showLock?: boolean
}

export function WalletHeader({ title, showLock = true }: WalletHeaderProps) {
  const [hasBackup, setHasBackup] = React.useState(false)

  React.useEffect(() => {
    const checkBackup = async () => {
      try {
        const backup = await hasSeedPhrase()
        setHasBackup(backup)
      } catch (error) {
        console.error("Error checking backup status:", error)
      }
    }
    checkBackup()
  }, [])

  const handleLock = async () => {
    try {
      await lockWallet()
      window.location.href = '/tabs/unlock.html'
    } catch (error) {
      console.error('Failed to lock wallet:', error)
    }
  }

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Heading size={'2'} truncate>{title}</Heading>
        <NetworkSelector />
      </div>

      <div className="flex items-center gap-2">
        {!hasBackup && (
          <div className="flex items-center gap-1 text-amber-600 text-xs">
            <span>⚠️</span>
            <span className="hidden sm:inline">No backup</span>
          </div>
        )}

        {showLock && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLock}
            className="h-8 w-8 p-0"
            title="Lock Wallet"
          >
            <Lock className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
