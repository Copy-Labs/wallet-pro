import {arbitrum, base, mainnet, optimism, polygon, sepolia} from "viem/chains"
import {
  arbitrum as alchemyArbitrum,
  base as alchemyBase,
  mainnet as alchemyMainnet,
  optimism as alchemyOptimism,
  polygon as alchemyPolygon,
  sepolia as alchemySepolia
} from "@alchemy/aa-core"
import type {Chain} from "viem"

// Supported chains for the wallet
export const supportedChains: Chain[] = [
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base
]

// Map of chain IDs to Alchemy AA chain objects
export const alchemyChainMap: Record<number, Chain> = {
  [sepolia.id]: alchemySepolia,
  [mainnet.id]: alchemyMainnet,
  [polygon.id]: alchemyPolygon,
  [optimism.id]: alchemyOptimism,
  [arbitrum.id]: alchemyArbitrum,
  [base.id]: alchemyBase
}

// Default chain
export const defaultChain = sepolia

// Get chain by ID
export const getChainById = (chainId: number): Chain | undefined => {
  return supportedChains.find(chain => chain.id === chainId)
}

// Get Alchemy AA chain by ID
export const getAlchemyChain = (chainId: number): Chain => {
  return alchemyChainMap[chainId] || alchemySepolia
}


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
