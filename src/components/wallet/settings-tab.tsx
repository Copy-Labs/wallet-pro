import React, { useState, useEffect } from "react"
import { Settings, Wallet, Smartphone, MoreVertical, Trash2, Edit3, Unlink } from "lucide-react"
import { Button } from "~ComponentsUI/ui/button"
import { Input } from "~ComponentsUI/ui/input"
import { Switch } from "../ui/switch"
import { Separator } from "../ui/separator"
import { Alert, AlertDescription } from "../ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~ComponentsUI/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useToast } from "~/hooks/use-toast"
import type { WalletAccount, DAppPermission, UserSettings } from "~/types/account"
import {
  getAllAccounts,
  deleteAccount,
  renameAccount
} from "~/services/wallet"
import {
  getStoredDAppPermissions,
  removeDAppPermission,
  getUserSettings,
  saveUserSettings
} from "~/utils/storage"
import {Label} from "@Components/ui/label";

export function SettingsTab() {
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [dappPermissions, setDappPermissions] = useState<DAppPermission[]>([])
  const [settings, setSettings] = useState<UserSettings>({
    enableGasSponsorship: true,
    sponsorshipThresholdUSD: 1.0
  })

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null)
  const [selectedPermission, setSelectedPermission] = useState<DAppPermission | null>(null)
  const [newAccountName, setNewAccountName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { toast } = useToast()

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [allAccounts, permissions, userSettings] = await Promise.all([
        getAllAccounts(),
        getStoredDAppPermissions().then(data => data.permissions),
        getUserSettings()
      ])

      setAccounts(allAccounts)
      setDappPermissions(permissions)
      setSettings(userSettings)
    } catch (error) {
      console.error("Error loading settings data:", error)
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive"
      })
    }
  }

  const handleRenameAccount = async () => {
    if (!selectedAccount || !newAccountName.trim()) return

    setIsLoading(true)
    try {
      await renameAccount(selectedAccount.id, newAccountName)
      await loadData()
      setRenameDialogOpen(false)
      setSelectedAccount(null)
      setNewAccountName("")
      toast({
        title: "Success",
        description: "Account renamed successfully"
      })
    } catch (error) {
      console.error("Error renaming account:", error)
      toast({
        title: "Error",
        description: "Failed to rename account",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return

    setIsLoading(true)
    try {
      await deleteAccount(selectedAccount.id)
      await loadData()
      setDeleteDialogOpen(false)
      setSelectedAccount(null)
      toast({
        title: "Success",
        description: "Account deleted successfully"
      })
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnectDApp = async () => {
    if (!selectedPermission) return

    setIsLoading(true)
    try {
      await removeDAppPermission(selectedPermission.origin)
      await loadData()
      setDisconnectDialogOpen(false)
      setSelectedPermission(null)
      toast({
        title: "Success",
        description: "DApp disconnected successfully"
      })
    } catch (error) {
      console.error("Error disconnecting DApp:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect DApp",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    try {
      await saveUserSettings(newSettings)
      toast({
        title: "Success",
        description: "Settings updated successfully"
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatOrigin = (origin: string) => {
    try {
      const url = new URL(origin)
      return url.hostname
    } catch {
      return origin
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Settings</h2>
        </div>

        {/* Account Management */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Account Management
          </h3>
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts available</p>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {formatAddress(account.address)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedAccount(account)
                          setNewAccountName(account.name)
                          setRenameDialogOpen(true)
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {accounts.length > 1 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedAccount(account)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
            {accounts.length === 1 && (
              <Alert>
                <AlertDescription>
                  You need at least one account. Create another account before deleting this one.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <Separator />

        {/* Gas Sponsorship Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Gas Sponsorship
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sponsorship-toggle" className="text-sm font-medium">
                  Enable Automatic Gas Sponsorship
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically sponsor gas fees under the threshold below
                </p>
              </div>
              <Switch
                id="sponsorship-toggle"
                checked={settings.enableGasSponsorship}
                onCheckedChange={(checked) => handleSettingChange('enableGasSponsorship', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold" className="text-sm font-medium">
                Sponsorship Threshold (USD)
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <Input
                  id="threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.sponsorshipThresholdUSD}
                  onChange={(e) => handleSettingChange('sponsorshipThresholdUSD', parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Transactions cheaper than this amount will be sponsored
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Connected DApps */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Connected DApps
          </h3>
          <div className="space-y-2">
            {dappPermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dApps connected</p>
            ) : (
              dappPermissions.map((permission) => (
                <div key={permission.origin} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{formatOrigin(permission.origin)}</div>
                      <div className="text-xs text-muted-foreground">
                        Connected {new Date(permission.connectedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPermission(permission)
                      setDisconnectDialogOpen(true)
                    }}
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rename Account Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Enter a new name for your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameAccount}
              disabled={isLoading || !newAccountName.trim()}
            >
              {isLoading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAccount?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>Warning:</strong> Deleting this account will permanently remove all associated data.
              Make sure you have backed up your private key if needed.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect DApp Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect DApp</DialogTitle>
            <DialogDescription>
              Disconnect {selectedPermission ? formatOrigin(selectedPermission.origin) : ""} from this wallet?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisconnectDApp}
              disabled={isLoading}
            >
              {isLoading ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
