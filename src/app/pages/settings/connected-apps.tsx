import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {Shield, ExternalLink, Globe, Lock, Unlock, Trash2, Link2Off} from "lucide-react"
import { Badge, Button, Card, Flex, Heading, Text, Dialog } from "@radix-ui/themes"
import { PageBody, PageContainer, PageHeader, PageHeading } from "~components/PageContainer"
import { getConnectedDApps, disconnectDApp, getDAppSecurityInfo } from "~services/connectedDApps"
import type { ConnectedDApp, DAppSecurity } from "~types/dapp"
import {DotSpacer} from "~components/DotSpacer";

export function ConnectedAppsPage() {
  const navigate = useNavigate()
  const [dApps, setDApps] = useState<ConnectedDApp[]>([])
  const [securityInfo, setSecurityInfo] = useState<Record<string, DAppSecurity>>({})
  const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; dApp?: ConnectedDApp }>({
    open: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadConnectedDApps()
  }, [])

  const loadConnectedDApps = async () => {
    try {
      const connectedDApps = await getConnectedDApps()
      setDApps(connectedDApps)

      // Load security info for each dApp
      const securityPromises = connectedDApps.map(async (dApp) => ({
        origin: dApp.origin,
        security: await getDAppSecurityInfo(dApp.origin)
      }))

      const securityResults = await Promise.all(securityPromises)
      const securityMap = securityResults.reduce((acc, { origin, security }) => {
        acc[origin] = security
        return acc
      }, {} as Record<string, DAppSecurity>)

      setSecurityInfo(securityMap)
    } catch (error) {
      console.error('Failed to load connected dApps:', error)
    }
  }

  const handleDisconnect = async (dApp: ConnectedDApp) => {
    setLoading(true)
    try {
      await disconnectDApp(dApp.origin)
      await loadConnectedDApps() // Reload the list
      setDisconnectDialog({ open: false })
    } catch (error) {
      console.error('Failed to disconnect DApp:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp) return 'Never'

    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getSecurityBadgeColor = (security: DAppSecurity): typeof Badge.defaultProps.color => {
    if (security.sslCertificate === 'invalid') return 'red'
    if (security.sslCertificate === 'valid' && security.reputation && security.reputation > 70) return 'green'
    return 'yellow'
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>Connected Apps</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} gap={'2'} px={'4'}>
          {dApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
              <Link2Off className="w-16 h-16 mb-4" />
              <Heading size="4" className="mb-2">No Connected Apps</Heading>
              <Text color={'gray'} className="mb-6">
                Apps you connect to will appear here. You can manage permissions and disconnect at any time.
              </Text>
              <Button onClick={() => navigate('/settings')} variant="soft">
                Back to Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <Text className="text-sm">
                Apps that have access to your wallet.
                <br/> You can revoke access at any time.
              </Text>

              {dApps.map((dApp) => {
                const security = securityInfo[dApp.origin]
                return (
                  <Card key={dApp.origin} className="">
                    <Flex align="center" justify="between" gap="3">
                      <Flex align="center" gap="3" className="flex-1">
                        <div className="flex-1 min-w-0">
                          <Flex align="center" gap="2" mb="0">
                            <Flex align={'center'} className="rounded-lg" justify={'center'}>
                              <Globe size={16} />
                            </Flex>
                            <Heading size="3" className="truncate">{dApp.name}</Heading>
                            {security && (
                              <Badge color={getSecurityBadgeColor(security)} variant="soft" size="1">
                                {security.sslCertificate === 'valid' ? (
                                  <Lock className="w-3 h-3" />
                                ) : (
                                  <Unlock className="w-3 h-3" />
                                )}
                                {security.sslCertificate === 'valid' ? 'Secure' : 'Insecure'}
                              </Badge>
                            )}
                          </Flex>

                          <Text className="" size={'2'} truncate>{dApp.origin}</Text>

                          <Flex align="center" my="1">
                            <Text className="" size={'2'}>
                              Connected: {new Date(dApp.connectedAt).toLocaleDateString()}
                            </Text>
                          </Flex>

                          <Flex align={'center'} justify={'between'}>
                            <Flex align={'center'} gap={'2'}>
                              <Text color={'gray'} className="" size={'1'}>
                                Last used:{" "}
                                {formatLastUsed(dApp.lastUsedAt)}
                              </Text>
                              <DotSpacer />
                              <Text color={'gray'} className="" size={'1'}>
                                account{dApp.accounts.length !== 1 ? 's' : ''}:{" "}
                                {dApp.accounts.length}
                              </Text>
                            </Flex>
                            <Flex align="center" gap="2" justify={'end'}>
                              <Button
                                variant="soft"
                                size="2"
                                onClick={() => window.open(dApp.origin, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="soft"
                                size="2"
                                color="red"
                                onClick={() => setDisconnectDialog({ open: true, dApp })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </Flex>
                          </Flex>
                        </div>
                      </Flex>
                    </Flex>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Disconnect Confirmation Dialog */}
          <Dialog.Root
            open={disconnectDialog.open}
            onOpenChange={(open) => setDisconnectDialog({ open })}
          >
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Disconnect App</Dialog.Title>
              <Dialog.Description size="2" mb="4">
                Are you sure you want to disconnect from <strong>{disconnectDialog.dApp?.name}</strong>?
                The app will lose access to your wallet and you'll need to reconnect if you want to use it again.
              </Dialog.Description>

              {disconnectDialog.dApp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <Text className="text-sm text-yellow-800">
                    <Shield className="w-4 h-4 inline mr-1" />
                    This action cannot be undone. You'll need to grant permission again if you want to reconnect.
                  </Text>
                </div>
              )}

              <Flex justify="end" gap="3">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  variant="solid"
                  color="red"
                  onClick={() => disconnectDialog.dApp && handleDisconnect(disconnectDialog.dApp)}
                  loading={loading}
                >
                  Disconnect
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </PageBody>
    </PageContainer>
  )
}
