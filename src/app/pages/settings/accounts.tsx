import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {ArrowLeft, User, Trash2, Edit, Check, X, Plus, PenIcon} from "lucide-react"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import {Button, Card, Dialog, Flex, Heading, IconButton, Spinner, Strong, Text, TextField, Theme} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"

import { getAllAccounts, renameAccount, deleteAccount, createSmartAccount } from "~/services/wallet"
import { useAccounts } from "~/store/ui-store"
import type {WalletAccount} from "~/types/account"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import { formatAddress } from "~/utils"
import { toast } from "sonner"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import { Drawer } from "vaul"

export function SettingsAccountsPage() {
  const navigate = useNavigate()
  const accounts = useAccounts()
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<{ account: WalletAccount | null }>({ account: null })

  useEffect(() => {
    // Just wait for accounts to load initially
    if (accounts) {
      setLoading(false)
    }
  }, [accounts])

  const startEditing = (account: WalletAccount) => {
    setEditingId(account.id)
    setEditName(account.name)
    // Open the Edit Account drawer
    setIsEditDrawerOpen(true)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName("")
    // Close the Edit Account drawer
    setIsEditDrawerOpen(false)
  }

  const saveNameChange = async () => {
    if (!editingId || !editName.trim()) return

    try {
      await renameAccount(editingId, editName.trim())
      toast.success('Account renamed successfully')
    } catch (error) {
      console.error('Failed to rename account:', error)
      toast.error('Failed to rename account')
    } finally {
      setEditingId(null)
      setEditName("")
      setIsEditDrawerOpen(false)
    }
  }

  const closeEditDrawer = () => {
    setIsEditDrawerOpen(false)
    setEditingId(null)
    setEditName("")
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteDialog.account) return

    try {
      await deleteAccount(showDeleteDialog.account.id)
      toast.success('Account deleted successfully')
    } catch (error) {
      console.error('Failed to delete account:', error)
      toast.error('Failed to delete account')
    } finally {
      setShowDeleteDialog({ account: null })
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return

    setCreating(true)
    try {
      const chainId = await getSelectedNetwork()
      const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain

      await createSmartAccount(newAccountName.trim(), chain)
      toast.success('New account created successfully')
      setNewAccountName("")
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create account:', error)
      toast.error('Failed to create account')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[600px] w-[375px] flex items-center justify-center">
        <Spinner size="3" className={'size-16'} />
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader>
        <Flex align={'center'} justify={'between'} width={'100%'}>
          {/* Header */}
          <PageHeading>Manage Accounts</PageHeading>

          <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <Dialog.Trigger>
              <Button size="1" variant="surface">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </Dialog.Trigger>
            <Dialog.Content className="sm:max-w-md">
              <Dialog.Title>Create New Account</Dialog.Title>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    placeholder="e.g., Trading Account"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  highContrast
                  onClick={handleCreateAccount}
                  disabled={creating || !newAccountName.trim()}
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </PageHeader>

      <PageBody>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <User className="w-16 h-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium mb-2">No Accounts</h3>
                <p className="text-muted-foreground text-sm">
                  You don't have any accounts yet. Create your first account to get started.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card
                  key={account.id}
                  size={'1'}
                  variant={'surface'}
                >
                  <Flex gap={'3'} align={'center'} justify={'between'}>
                    <Flex align={'center'} gap={'2'}>
                      <Flex direction={'column'}>
                        <Heading size={'2'} weight={'medium'}>{account.name}</Heading>
                        <Text color={'gray'} size={'2'} className="font-mono">
                          {formatAddress(account.address)}
                        </Text>
                      </Flex>
                      {/*{editingId === account.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveNameChange()
                              if (e.key === 'Escape') cancelEditing()
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button size="1" variant="ghost" onClick={saveNameChange}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="1" variant="ghost" onClick={cancelEditing}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-medium">{account.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">
                            {formatAddress(account.address)}
                          </p>
                        </div>
                      )}*/}
                    </Flex>

                    {editingId === account.id && <Drawer.Root open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen} onClose={closeEditDrawer}>
                      {/*<Drawer.Trigger>*/}
                      {/*  <IconButton size={'1'} variant={'soft'}><PenIcon size={12} strokeWidth={3} /></IconButton>*/}
                      {/*</Drawer.Trigger>*/}
                      <Drawer.Portal>
                        <Drawer.Overlay className="fixed inset-0 bg-black/40"/>
                        <Drawer.Content
                          className="bg-gray-100 dark:bg-gray12 h-fit fixed bottom-0 left-0 right-0 outline-none rounded-t-2xl">
                          <Flex direction={'column'} className="p-4 w-full">
                            <div aria-hidden className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray11 mb-8"/>
                            <Drawer.Title className="font-medium mb-4">
                              Update Account Name
                            </Drawer.Title>
                            <Flex direction={'column'} align={'center'} justify={'start'} gap={'3'} className="flex-1">
                                {/*<Input
                                  hidden
                                  autoFocus
                                  className="flex-1"
                                  placeholder={account.name}
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveNameChange()
                                    if (e.key === 'Escape') cancelEditing()
                                  }}
                                />*/}
                              <Theme className={'w-full pb-3 space-y-3'} radius={'large'}>
                                  <TextField.Root
                                      autoFocus
                                      size="2"
                                      placeholder={account.name}
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveNameChange()
                                        if (e.key === 'Escape') cancelEditing()
                                      }}
                                  />
                                <Flex width={'100%'} align={'center'} justify={'end'} gap={'2'}>
                                  <Button highContrast size="2" variant="solid" onClick={saveNameChange} radius={'large'}>
                                    Save
                                  </Button>
                                  <Button className={'ml-0.5'} color={'red'} size="2" variant="soft"
                                          onClick={cancelEditing}>
                                    Cancel
                                  </Button>
                                </Flex>
                              </Theme>
                            </Flex>
                          </Flex>
                        </Drawer.Content>
                      </Drawer.Portal>
                    </Drawer.Root>}

                    {editingId !== account.id && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="1"
                          variant="ghost"
                          onClick={() => startEditing(account)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          className="text-red-600 hover:text-red-700"
                          disabled={accounts.length === 1} // Prevent deleting the last account
                          size="1"
                          variant="ghost"
                          onClick={() => setShowDeleteDialog({ account })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </Flex>

                  <Text color={'gray'} size={'1'}>
                    Created {new Date(account.createdAt).toLocaleDateString()}
                    {account.lastUsed && ` • Last used ${new Date(account.lastUsed).toLocaleDateString()}`}
                  </Text>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageBody>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={!!showDeleteDialog.account}
        onOpenChange={(open) => !open && setShowDeleteDialog({ account: null })}
      >
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Title>Delete Account</Dialog.Title>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete the account "{showDeleteDialog.account?.name}"?
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>This action cannot be undone.</strong> You will lose access to this account if you don't have the seed phrase backed up.
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-sm text-red-800 dark:text-red-200">
                Address: {showDeleteDialog.account ? formatAddress(showDeleteDialog.account.address) : ''}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog({ account: null })}
            >
              Cancel
            </Button>
            <Button
              color={'red'}
              variant="solid"
              onClick={handleDeleteAccount}
            >
              Delete Account
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Bottom Navigation */}
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
