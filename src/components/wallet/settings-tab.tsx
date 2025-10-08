import React, { useState, useEffect } from "react"
import { Lock, Key, Download, Upload, Shield, AlertTriangle, Zap } from "lucide-react"
import { Button } from "~components/ui/button"
import { Badge, Callout } from "@radix-ui/themes"
import { lockWallet, isWalletInitialized } from "~services/security"
import { hasSeedPhrase, exportAccountData, createBackupFile } from "~services/recovery"
import { getGasSponsorshipStatus } from "~/utils/test-gas-sponsorship"

export function SettingsTab() {
  const [hasBackup, setHasBackup] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gasSponsorshipStatus, setGasSponsorshipStatus] = useState(getGasSponsorshipStatus())

  useEffect(() => {
    checkSecurityStatus()
  }, [])

  const checkSecurityStatus = async () => {
    const backup = await hasSeedPhrase()
    const init = await isWalletInitialized()
    setHasBackup(backup)
    setIsInitialized(init)
  }

  const handleLockWallet = async () => {
    try {
      await lockWallet()
      // Redirect to unlock page
      window.location.href = '/tabs/unlock.html'
    } catch (error) {
      console.error('Failed to lock wallet:', error)
    }
  }

  const handleBackupSeed = () => {
    window.open('/tabs/backup-seed.html', '_blank', 'width=600,height=800')
  }

  const handleExportBackup = async () => {
    setLoading(true)
    try {
      const password = prompt('Enter your password to export backup:')
      if (!password) return

      const encrypted = await exportAccountData(password)
      const blob = createBackupFile(encrypted)

      // Download file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `smart-wallet-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      alert('Backup exported successfully!')
    } catch (error) {
      alert('Failed to export backup: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImportBackup = () => {
    window.open('/tabs/recover.html', '_blank', 'width=600,height=800')
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      {/* Security Status */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold">Security Status</h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Password Protection</span>
            <span className={isInitialized ? "text-green-600" : "text-red-600"}>
              {isInitialized ? "✓ Enabled" : "✗ Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Seed Phrase Backup</span>
            <span className={hasBackup ? "text-green-600" : "text-yellow-600"}>
              {hasBackup ? "✓ Backed Up" : "⚠ Not Backed Up"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Auto-Lock</span>
            <span className="text-green-600">✓ 5 minutes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Gas Sponsorship</span>
            <Badge
              color={gasSponsorshipStatus.enabled ? "green" : "gray"}
              variant="soft"
              size="1"
            >
              {gasSponsorshipStatus.enabled ? (
                <>
                  <Zap size={10} />
                  Active
                </>
              ) : (
                "Inactive"
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Gas Sponsorship Info */}
      {gasSponsorshipStatus.enabled && (
        <Callout.Root color="green" size="1">
          <Callout.Icon>
            <Zap />
          </Callout.Icon>
          <Callout.Text>
            <strong>Gasless Transactions Enabled!</strong> Your transactions don't require ETH for gas fees. Powered by Alchemy Gas Manager.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Backup Warning */}
      {!hasBackup && (
        <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">Backup Recommended</h4>
              <p className="text-sm text-yellow-700 mb-3">
                You haven't backed up your seed phrase. Without it, you cannot recover your wallet if you lose access.
              </p>
              <Button
                onClick={handleBackupSeed}
                size="sm"
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
              >
                <Key className="w-4 h-4 mr-2" />
                Backup Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Security Actions */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold mb-3">Security Actions</h3>

        <Button
          onClick={handleLockWallet}
          variant="outline"
          className="w-full justify-start"
        >
          <Lock className="w-4 h-4 mr-2" />
          Lock Wallet
        </Button>

        <Button
          onClick={handleBackupSeed}
          variant="outline"
          className="w-full justify-start"
        >
          <Key className="w-4 h-4 mr-2" />
          {hasBackup ? 'View Seed Phrase' : 'Backup Seed Phrase'}
        </Button>

        <Button
          onClick={handleExportBackup}
          variant="outline"
          className="w-full justify-start"
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Backup File
        </Button>

        <Button
          onClick={handleImportBackup}
          variant="outline"
          className="w-full justify-start"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import Backup File
        </Button>
      </div>

      {/* About */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-2">About</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Smart Wallet Pro v1.0.0</p>
          <p>Powered by Alchemy Account Abstraction</p>
        </div>
      </div>
    </div>
  )
}
