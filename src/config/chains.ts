import { sepolia, mainnet, polygon, optimism, arbitrum, base } from "viem/chains"
import type { Chain } from "viem"

// Supported chains for the wallet
export const supportedChains: Chain[] = [
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base
]

// Default chain
export const defaultChain = sepolia

// Get chain by ID
export const getChainById = (chainId: number): Chain | undefined => {
  return supportedChains.find(chain => chain.id === chainId)
}
