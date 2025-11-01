import {arbitrum, base, mainnet, optimism, polygon, sepolia} from "viem/chains"
import type {Chain} from "viem"

// Supported chains for the wallet - now supports any EVM chain via EIP-7702
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

// Get chain by ID (checks both predefined and custom networks)
export const getChainById = async (chainId: number): Promise<Chain | undefined> => {
  // First check predefined supported chains
  const predefinedChain = supportedChains.find(chain => chain.id === chainId)
  if (predefinedChain) return predefinedChain

  // Then check custom networks added by user
  try {
    const { getCustomNetworkByChainId } = await import("~/utils/storage")
    const customNetwork = await getCustomNetworkByChainId(chainId)

    if (customNetwork) {
      // Convert custom network to viem Chain format
      return {
        id: customNetwork.chainId,
        name: customNetwork.name,
        nativeCurrency: customNetwork.currency,
        rpcUrls: {
          default: { http: [customNetwork.rpcUrl] },
          public: { http: [customNetwork.rpcUrl] },
        },
        blockExplorers: customNetwork.blockExplorerUrl ? {
          default: { name: 'Explorer', url: customNetwork.blockExplorerUrl },
        } : undefined,
        testnet: false, // This will be determined separately in the UI layer
      } as Chain
    }
  } catch (error) {
    console.warn('[getChainById] Error checking custom networks:', error)
  }

  return undefined
}

// Note: EIP-7702 removes chain mapping restrictions - any EVM chain works


// Chain metadata for UI display
export interface ChainMetadata {
  id: number
  name: string
  shortName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorer: string
  isTestnet: boolean
  icon?: string
}

export const chainMetadata: Record<number, ChainMetadata> = {
  [mainnet.id]: {
    id: mainnet.id,
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    nativeCurrency: mainnet.nativeCurrency,
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
    icon: '⟠'
  },
  [sepolia.id]: {
    id: sepolia.id,
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    nativeCurrency: sepolia.nativeCurrency,
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    icon: '⟠'
  },
  [polygon.id]: {
    id: polygon.id,
    name: 'Polygon Mainnet',
    shortName: 'Polygon',
    nativeCurrency: polygon.nativeCurrency,
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
    icon: '⬡'
  },
  [optimism.id]: {
    id: optimism.id,
    name: 'Optimism Mainnet',
    shortName: 'Optimism',
    nativeCurrency: optimism.nativeCurrency,
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
    icon: '🔴'
  },
  [arbitrum.id]: {
    id: arbitrum.id,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    nativeCurrency: arbitrum.nativeCurrency,
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
    icon: '🔵'
  },
  [base.id]: {
    id: base.id,
    name: 'Base Mainnet',
    shortName: 'Base',
    nativeCurrency: base.nativeCurrency,
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
    icon: '🔷'
  }
}

export function isTestnetChain(chainName: string): boolean {
  // || item.chainId > 1000; // Simple heuristic for testnets

  return chainName.toLowerCase().includes('testnet')
    || chainName.toLowerCase().includes('test')
    || chainName.toLowerCase().includes('sepolia');
}
