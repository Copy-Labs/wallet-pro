import React, { useState, useEffect } from "react"
import { Network, Check, Wifi, WifiOff } from "lucide-react"
import type { Chain } from "viem"
import { supportedChains, chainMetadata, defaultChain, getChainById } from "~/config/chains"
import { getSelectedNetwork, saveSelectedNetwork } from "~/utils/storage"
import { createPublicClient, http } from "viem"
import { getAlchemyRpcUrl } from "~/config/alchemy"
import {ScrollArea} from "@radix-ui/themes";

// Network status type (copied from NetworkSelector)
interface NetworkStatus {
  chainId: number
  isOnline: boolean
  isChecking: boolean
}

export function NetworksTab() {
  const [selectedChainId, setSelectedChainId] = useState<number>(defaultChain.id)
  const [networkStatuses, setNetworkStatuses] = useState<Map<number, NetworkStatus>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadSelectedNetwork()
    checkNetworkStatuses()
  }, [])

  const loadSelectedNetwork = async () => {
    try {
      const chainId = await getSelectedNetwork()
      if (chainId) {
        setSelectedChainId(chainId)
      }
    } catch (error) {
      console.error("Error loading selected network:", error)
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

        await client.getBlockNumber()
        statuses.set(chain.id, { chainId: chain.id, isOnline: true, isChecking: false })
      } catch (error) {
        statuses.set(chain.id, { chainId: chain.id, isOnline: false, isChecking: false })
      }
    }

    setNetworkStatuses(statuses)
  }

  const handleSelectNetwork = async (chain: Chain) => {
    if (chain.id === selectedChainId) return

    setIsLoading(true)
    try {
      await saveSelectedNetwork(chain.id)
      setSelectedChainId(chain.id)

      // Dispatch network change event to refresh balances
      window.dispatchEvent(new CustomEvent('networkChanged', { detail: chain.id }))
    } catch (error) {
      console.error("Error switching network:", error)
      alert(`Failed to switch network: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getNetworkIcon = (chain: Chain) => {
    const metadata = chainMetadata[chain.id]
    return (
      <div className="flex items-center gap-1">
        <span className="text-base">{metadata?.icon || "⟠"}</span>
      </div>
    )
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

  const getNetworkDescription = (chain: Chain): string => {
    const descriptions: Record<number, string> = {
      1: "Ethereum Mainnet - The main Ethereum network",
      11155111: "Sepolia Testnet - Ethereum test network",
      137: "Polygon - Layer 2 scaling solution",
      10: "Optimism - Optimistic rollup L2",
      42161: "Arbitrum - Optimistic rollup L2",
      8453: "Base - Coinbase L2 network"
    }
    return descriptions[chain.id] || "EVM-compatible network"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-1">Select Network</h3>
        <p className="text-sm text-muted-foreground">
          Choose the blockchain network for your wallet
        </p>
      </div>

      {/* Network List */}
      <ScrollArea type="always" scrollbars="vertical" style={{ height: 450 }}>
        {/*<iframe src="http://localhost:5173/embed?fdb=K4Tg527GhCbDNWM14wyEyg" width="400" height="270"*/}
        {/*        frameBorder="0"></iframe>*/}
        {supportedChains.map((chain) => {
          const isSelected = chain.id === selectedChainId
          const isTestnet = chain.testnet

          return (
            <button
              key={chain.id}
              className={`w-full p-4 border rounded-lg text-left transition-colors ${
                isSelected
                  ? "bg-accent border-accent-foreground/20"
                  : "hover:bg-accent/50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={() => handleSelectNetwork(chain)}
              disabled={isLoading}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getNetworkIcon(chain)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{chain.name}</span>
                      {getNetworkStatusIcon(chain)}
                      {isTestnet && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded">
                          Testnet
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getNetworkDescription(chain)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chain ID: {chain.id}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </ScrollArea>

      {/* Info Footer */}
      <div className="border-t p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          💡 Switching networks instantly updates all account balances.
          Make sure you have the native token (ETH, MATIC, etc.) for gas fees on the selected network.
        </p>
      </div>
    </div>
  )
}
