import React, { useState, useEffect } from "react"
import { Network, Check, Wifi, WifiOff } from "lucide-react"
import type { Chain } from "viem"
import { supportedChains, chainMetadata, defaultChain, getChainById } from "~/config/chains"
import { getSelectedNetwork, saveSelectedNetwork } from "~/utils/storage"
import { createPublicClient, http } from "viem"
import { getAlchemyRpcUrl } from "~/config/alchemy"
import {Button, DropdownMenu, Text} from "@radix-ui/themes"

// Network status type
interface NetworkStatus {
  chainId: number
  isOnline: boolean
  isChecking: boolean
}

export function NetworkSelector() {
  const [selectedChain, setSelectedChain] = useState<Chain>(defaultChain)
  const [networkStatuses, setNetworkStatuses] = useState<Map<number, NetworkStatus>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadCurrentNetwork()
    checkNetworkStatuses()
  }, [])

  const loadCurrentNetwork = async () => {
    try {
      const chainId = await getSelectedNetwork()
      const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain
      setSelectedChain(chain)
    } catch (error) {
      console.error("Error loading current network:", error)
    }
  }

  const checkNetworkStatuses = async () => {
    const statuses = new Map<number, NetworkStatus>()

    for (const chain of supportedChains) {
      statuses.set(chain.id, { chainId: chain.id, isOnline: false, isChecking: true })

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

    setNetworkStatuses(statuses)
  }

  const handleNetworkSwitch = async (chain: Chain) => {
    if (chain.id === selectedChain.id) return

    setIsLoading(true)
    try {
      await saveSelectedNetwork(chain.id)
      setSelectedChain(chain)

      // Trigger balance refresh in parent components
      // This will be handled via context or props in the future
      window.dispatchEvent(new CustomEvent('networkChanged', { detail: chain.id }))

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

  const currentMetadata = chainMetadata[selectedChain.id]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {/*<button*/}
        {/*  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm font-medium min-w-0"*/}
        {/*  disabled={isLoading}>*/}
        {/*  <span className="text-base">{currentMetadata?.icon || "⟠"}</span>*/}
        {/*  <span className="truncate">{currentMetadata?.shortName || selectedChain.name}</span>*/}
        {/*  {getNetworkStatusIcon(selectedChain)}*/}
        {/*</button>*/}
        <Button
          disabled={isLoading}
          size={'1'}
          variant="soft"
        >
          <Text size={'2'}>{currentMetadata?.icon || "⟠"}</Text>
          <Text truncate={true}>{currentMetadata?.shortName || selectedChain.name}</Text>
          {getNetworkStatusIcon(selectedChain)}
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
          const isSelected = chain.id === selectedChain.id

          return (
            <DropdownMenu.Item
              key={chain.id}
              // className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent"
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
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
