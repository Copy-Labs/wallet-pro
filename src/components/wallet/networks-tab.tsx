import React, { useState, useEffect } from "react"
import { Network, Check } from "lucide-react"
import type { Chain } from "viem"
import { supportedChains, defaultChain } from "~/config/chains"
import { getSelectedNetwork, saveSelectedNetwork } from "~/utils/storage"
import {ScrollArea} from "@radix-ui/themes";

export function NetworksTab() {
  const [selectedChainId, setSelectedChainId] = useState<number>(defaultChain.id)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadSelectedNetwork()
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

  const handleSelectNetwork = async (chain: Chain) => {
    if (chain.id === selectedChainId) return

    setIsLoading(true)
    try {
      await saveSelectedNetwork(chain.id)
      setSelectedChainId(chain.id)

      // Reload the page to apply network change
      // In a real app, you'd want to refresh balances and reconnect clients
      window.location.reload()
    } catch (error) {
      console.error("Error switching network:", error)
      alert(`Failed to switch network: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getNetworkIcon = (chain: Chain) => {
    // You can add custom icons per network if desired
    return <Network className="w-5 h-5 text-muted-foreground" />
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
          💡 Switching networks will reload the extension and update all account balances.
          Make sure you have the native token (ETH, MATIC, etc.) for gas fees on the selected network.
        </p>
      </div>
    </div>
  )
}
