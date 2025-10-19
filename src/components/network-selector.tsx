import React, { useState, useEffect } from "react"
import { Network, Check, Wifi, WifiOff, Plus } from "lucide-react"
import {useNavigate} from "react-router-dom"
import type { Chain } from "viem"
import { supportedChains, chainMetadata } from "~/config/chains"
import { createPublicClient, http } from "viem"
import { getAlchemyRpcUrl } from "~/config/alchemy"
import {Avatar, Badge, Button, DropdownMenu, Flex, Select, Text} from "@radix-ui/themes"
import { useUIStore, useNetworkType, useCustomNetworks, useCustomNetworkStatuses } from "~/store/ui-store"
import {getNetworkType, getChainsByNetworkType, getAllNetworksGroupedByType} from "~utils/helper";

// Network status type
interface NetworkStatus {
  chainId: number
  isOnline: boolean
  isChecking: boolean
}

export function NetworkSelector() {
  const { selectedNetwork, networkStatuses, setSelectedNetwork, setNetworkStatuses, setCustomNetworkStatus, updateNetworkStatus, refreshBalances } = useUIStore()
  const networkType = useNetworkType()
  const [isLoading, setIsLoading] = useState(false)
  const [checkingInProgress, setCheckingInProgress] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState(0)
  const navigate = useNavigate()

  // Get custom networks from store
  const customNetworks = useCustomNetworks()
  const customNetworkStatuses = useCustomNetworkStatuses()

  useEffect(() => {
    // Initial check when component mounts or network type changes
    checkNetworkStatuses()

    // Set up periodic status refresh every 30 seconds
    const interval = setInterval(() => {
      checkNetworkStatuses()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [networkType, customNetworks]) // Also run when custom networks load from storage

  const checkNetworkStatuses = async () => {
    // Prevent concurrent status checks and too-frequent checks (< 5 seconds apart)
    if (checkingInProgress || Date.now() - lastCheckTime < 5000) {
      return
    }

    setCheckingInProgress(true)
    setLastCheckTime(Date.now())

    const statuses = new Map<number, NetworkStatus>()

    // Check predefined networks of the current type
    const networksToCheck = getChainsByNetworkType(networkType)

    // Batch set all predefined statuses to checking first
    const checkingStatuses = new Map<number, NetworkStatus>()
    for (const chain of networksToCheck) {
      checkingStatuses.set(chain.id, { chainId: chain.id, isOnline: false, isChecking: true })
    }
    setNetworkStatuses(checkingStatuses)

    // Check predefined network connectivity
    for (const chain of networksToCheck) {
      try {
        const client = createPublicClient({
          chain,
          transport: http(getAlchemyRpcUrl(chain))
        })

        // Simple check: get block number (fast RPC call)
        await client.getBlockNumber()
        statuses.set(chain.id, { chainId: chain.id, isOnline: true, isChecking: false })
      } catch (error) {
        statuses.set(chain.id, { chainId: chain.id, isOnline: false, isChecking: false })
      }
    }

    // Now check custom networks of the current type
    const { isTestnetChain } = require('~/config/chains')
    const customNetworksForType = customNetworks.filter(net =>
      (networkType === 'testnet') ? isTestnetChain(net.name) : !isTestnetChain(net.name)
    )

    console.log('🔍 Checking custom networks:', customNetworksForType.length, customNetworks)

    // Set custom networks to checking status
    for (const customNet of customNetworksForType) {
      console.log('⚡ Setting custom network to checking:', customNet.name)
      setCustomNetworkStatus(customNet.id, 'checking')
    }

    // Check custom network connectivity
    for (const customNet of customNetworksForType) {
      console.log('🔗 Checking custom network:', customNet.name, 'RPC:', customNet.rpcUrl)

      try {
        // Simplified viem client creation - just need transport and fetch
        const client = createPublicClient({
          transport: http(customNet.rpcUrl)
        })

        console.log('📡 Calling getBlockNumber for', customNet.name)
        // Simple check: get block number
        const blockNumber = await client.getBlockNumber()
        console.log('✅ Custom network online:', customNet.name, 'Block:', blockNumber)

        setCustomNetworkStatus(customNet.id, 'online')
      } catch (error) {
        console.error('❌ Custom network failed:', customNet.name, 'Error:', error)
        setCustomNetworkStatus(customNet.id, 'offline')
      }
    }

    // Single batch update for predefined networks to prevent multiple re-renders
    setNetworkStatuses(statuses)
    setCheckingInProgress(false)
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

  const getCustomNetworkStatusIcon = (networkId: string) => {
    const status = customNetworkStatuses.get(networkId) || 'offline'
    if (status === 'checking') {
      return <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full" />
    }
    if (status === 'online') {
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
            maxWidth={'120px'}
          >
            <Text size={'2'}>
              {currentMetadata?.icon || "⟠"}
            </Text>
            <Text truncate={true}>{currentMetadata?.shortName || selectedNetwork.name}</Text>
            {getNetworkStatusIcon(selectedNetwork)}
          </Flex>
        </Select.Trigger>
        <Select.Content highContrast variant="soft" color="gray" position="popper">
          <Select.Group>
            <Select.Label>{networkType.toUpperCase()}</Select.Label>

            {/* Get networks grouped by type using the new helper function */}
            {getAllNetworksGroupedByType()[networkType]?.map((network) => {
              const isSelected = network.chainId === selectedNetwork.id
              const isPredefinedNetwork = !network.isCustom

              // For predefined networks, use the chain object
              if (isPredefinedNetwork) {
                const chain = supportedChains.find(c => c.id === network.chainId)
                const metadata = chainMetadata[network.chainId]

                if (!chain) return null

                return (
                  <Select.Item
                    className={'h-12'}
                    key={network.chainId}
                    value={network.chainId.toString()}
                    textValue={network.name}
                  >
                    <Flex align={'start'} gap={'2'}>
                      {/*<span className="text-base">{metadata?.icon || "⟠"}</span>*/}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <Text truncate size={'2'}>{network.name}</Text>
                          {getNetworkStatusIcon(chain)}
                          {/*{networkType === 'testnet' && (
                            <Badge size="1" color="amber">
                              Testnet
                            </Badge>
                          )}*/}
                        </div>
                        <Flex align={'center'} gap={'1'}>

                          <Text color={'gray'} size={'1'} weight={'medium'}>Chain ID: {network.chainId}</Text>
                        </Flex>
                      </div>
                    </Flex>
                  </Select.Item>
                )
              }

              // For custom networks
              const status = customNetworkStatuses.get(network.id) || 'offline'

              return (
                <Select.Item
                  className={'h-12'}
                  key={network.id}
                  value={network.chainId.toString()}
                  textValue={network.name}
                >
                  <Flex align={'start'} gap={'2'}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <Text truncate size={'2'}>{network.name}</Text>
                        <Badge hidden size="1" color="blue">
                          Custom
                        </Badge>
                        {getCustomNetworkStatusIcon(network.id)}
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
            }) || []}

          </Select.Group>

          {/* Add Custom Network Option */}
          <Select.Separator />
          <Flex align={'center'} className="p-1" gap={'2'}>
            <Button
              size="1"
              variant="soft"
              className="w-auto"
              onClick={() => navigate('/networks')}
            >
              Show All
            </Button>
            <Button
              size="1"
              variant="soft"
              className="w-auto"
              onClick={() => navigate('/networks/add')}
            >
              <Plus size={12} strokeWidth={3} />
              Add Network
            </Button>
          </Flex>
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
