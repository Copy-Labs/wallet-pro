import React, { useState, useEffect } from "react"
import { Network, Check, Wifi, WifiOff, Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Chain } from "viem"
import { supportedChains, chainMetadata } from "~/config/chains"
import { createPublicClient, http } from "viem"
import { getAlchemyRpcUrl } from "~/config/alchemy"
import {Badge, Button, DropdownMenu, Flex, Select, Text} from "@radix-ui/themes"
import { useUIStore, useNetworkType, useCustomNetworks, useCustomNetworkStatuses } from "~/store/ui-store"
import {getNetworkType, getChainsByNetworkType} from "~utils/helper";

// Network status type
interface NetworkStatus {
  chainId: number
  isOnline: boolean
  isChecking: boolean
}

export function NetworkSelector() {
  const { selectedNetwork, networkStatuses, setSelectedNetwork, setNetworkStatuses, updateNetworkStatus, refreshBalances } = useUIStore()
  const networkType = useNetworkType()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // Get custom networks from store
  const customNetworks = useCustomNetworks()
  const customNetworkStatuses = useCustomNetworkStatuses()

  useEffect(() => {
    checkNetworkStatuses()
  }, [networkType]) // Re-check when network type changes

  const checkNetworkStatuses = async () => {
    const statuses = new Map<number, NetworkStatus>()

    // Only check status for networks of the current type
    const networksToCheck = getChainsByNetworkType(networkType)

    for (const chain of networksToCheck) {
      statuses.set(chain.id, { chainId: chain.id, isOnline: false, isChecking: true })
      updateNetworkStatus(chain.id, { chainId: chain.id, isOnline: false, isChecking: true })

      try {
        const client = createPublicClient({
          chain,
          transport: http(getAlchemyRpcUrl(chain))
        })

        // Simple check: get block number (fast RPC call)
        await client.getBlockNumber()
        updateNetworkStatus(chain.id, { chainId: chain.id, isOnline: true, isChecking: false })
      } catch (error) {
        updateNetworkStatus(chain.id, { chainId: chain.id, isOnline: false, isChecking: false })
      }
    }

    setNetworkStatuses(statuses)
  }

  const handleNetworkSwitch = async (chainIdString: string) => {
    const chainId = parseInt(chainIdString)
    const chain = supportedChains.find(c => c.id === chainId)
    if (!chain) return

    if (chain.id === selectedNetwork.id) return

    setIsLoading(true)
    try {
      // Update store - this will automatically sync to storage via storage-sync.ts
      setSelectedNetwork(chain)

      // Trigger balance refresh via store (reactive update)
      refreshBalances()

      // Re-check statuses occasionally (every 30 seconds via setInterval could be added)
    } catch (error) {
      console.error("Error switching network:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getNetworkStatusIcon = (chain: Chain) => {
    const status = networkStatuses.get(chain.id)
    if (status?.isChecking) {
      return <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full" />
    }
    if (status?.isOnline) {
      return <Wifi className="w-3 h-3 text-green-500" />
    }
    return <WifiOff className="w-3 h-3 text-red-500" />
  }

  const currentMetadata = chainMetadata[selectedNetwork.id]

  return (
    <>
      <Select.Root size={'1'} onValueChange={handleNetworkSwitch} value={selectedNetwork.id.toString()}>
        <Select.Trigger variant={"soft"} placeholder="Select a network" disabled={isLoading}>
          <Flex
            align={'center'}
            gap={'2'}
            // size={'2'}
          >
            <Text size={'2'}>{currentMetadata?.icon || "⟠"}</Text>
            <Text truncate={true}>{currentMetadata?.shortName || selectedNetwork.name}</Text>
            {getNetworkStatusIcon(selectedNetwork)}
          </Flex>
        </Select.Trigger>
        <Select.Content highContrast variant="soft" color="gray" position="popper">
          <Select.Group>
            <Select.Label>{networkType.toUpperCase()}</Select.Label>
            {getChainsByNetworkType(networkType).map((chain) => {
              const metadata = chainMetadata[chain.id]
              const isSelected = chain.id === selectedNetwork.id

              return (
                <Select.Item
                  className={'h-12'}
                  key={chain.name}
                  value={chain.id.toString()}
                  textValue={chain.name}
                >
                  <Flex align={'start'} gap={'2'}>
                    <span className="text-base">{metadata?.icon || "⟠"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <Text truncate size={'2'}>{chain.name}</Text>
                        {metadata?.isTestnet && (
                          <Badge size="1" color="amber">
                            Testnet
                          </Badge>
                        )}
                      </div>
                      <Flex align={'center'} gap={'1'}>
                        {getNetworkStatusIcon(chain)}
                        <Text color={'gray'} size={'1'} weight={'medium'}>Chain ID: {chain.id}</Text>
                      </Flex>
                    </div>
                  </Flex>
                </Select.Item>
              )
            })}
          </Select.Group>

          {/* Custom Networks Section */}
          {customNetworks.length > 0 && (
            <Select.Group>
              <Select.Label>Custom Networks</Select.Label>
              {customNetworks.map((network) => {
                const isSelected = network.chainId === selectedNetwork.id
                const status = customNetworkStatuses.get(network.id) || network.status

                return (
                  <Select.Item
                    className={'h-12'}
                    key={network.id}
                    value={network.chainId.toString()}
                    textValue={network.name}
                  >
                    <Flex align={'start'} gap={'2'}>
                      <span className="text-base">🔗</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <Text truncate size={'2'}>{network.name}</Text>
                          <Badge size="1" color="blue">
                            Custom
                          </Badge>
                          <Badge
                            size="1"
                            color={
                              status === 'online' ? 'green' :
                              status === 'offline' ? 'red' : 'amber'
                            }
                          >
                            {status}
                          </Badge>
                        </div>
                        <Flex align={'center'} gap={'1'}>
                          <Text color={'gray'} size={'1'} weight={'medium'}>
                            Chain ID: {network.chainId}
                          </Text>
                        </Flex>
                      </div>
                    </Flex>
                  </Select.Item>
                )
              })}
            </Select.Group>
          )}

          {/* Add Custom Network Option */}
          <Select.Separator />
          <div className="p-2">
            <Button
              size="1"
              variant="soft"
              className="w-full"
              onClick={() => navigate('/networks/add')}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Custom Network
            </Button>
          </div>
        </Select.Content>
      </Select.Root>

      {/*<DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button
            disabled={isLoading}
            size={'2'}
            variant="soft"
          >
            <Text size={'2'}>{currentMetadata?.icon || "⟠"}</Text>
            <Text truncate={true}>{currentMetadata?.shortName || selectedNetwork.name}</Text>
            {getNetworkStatusIcon(selectedNetwork)}
            <DropdownMenu.TriggerIcon />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          side="bottom"
          align="start"
          // className="w-64 bg-background border rounded-lg shadow-lg p-2"
        >
          {supportedChains.map((chain) => {
            const metadata = chainMetadata[chain.id]
            const isSelected = chain.id === selectedNetwork.id

            return (
              <DropdownMenu.Item
                key={chain.id}
                className="h-12 flex items-center gap-1 px-2 py-4 rounded cursor-pointer hover:bg-accent"
                onClick={() => handleNetworkSwitch(chain)}
              >
                <span className="text-base">{metadata?.icon || "⟠"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium truncate">{chain.name}</span>
                    {metadata?.isTestnet && (
                      <span className="text-xs px-1 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded">
                        Testnet
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {getNetworkStatusIcon(chain)}
                    <span>Chain ID: {chain.id}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
              </DropdownMenu.Item>
            )
          })}
          <Button>Add New</Button>
        </DropdownMenu.Content>
      </DropdownMenu.Root>*/}
    </>
  )
}
