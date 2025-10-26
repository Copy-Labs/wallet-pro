import type { Chain } from "viem"

// RPC Provider types and configurations
export type RpcProviderType = 'alchemy' | 'ankr' | 'infura' | 'public'

export interface RPCProvider {
  name: string
  key: string
  getUrl: (chainId: number) => string
  limits?: {
    maxBlockRange?: number
    requestsPerSecond?: number
    description?: string
  }
  priority: number // 0 = highest priority
}

// API Keys from environment
const ALCHEMY_API_KEY = process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY || ''
const ANKR_API_KEY = process.env.PLASMO_PUBLIC_ANKR_API_KEY || ''
const INFURA_API_KEY = process.env.PLASMO_PUBLIC_INFURA_API_KEY || ''

// RPC Provider configurations
export const SUPPORTED_RPC_PROVIDERS: Record<RpcProviderType, RPCProvider> = {
  alchemy: {
    name: 'Alchemy',
    key: ALCHEMY_API_KEY,
    priority: 0,
    limits: {
      maxBlockRange: 10, // Free tier limit
      requestsPerSecond: 330,
      description: '10 block range limit on free tier'
    },
    getUrl: (chainId: number) => {
      const networkMap: Record<number, string> = {
        1: "eth-mainnet.g.alchemy.com/v2/",
        11155111: "eth-sepolia.g.alchemy.com/v2/",
        137: "polygon-mainnet.g.alchemy.com/v2/",
        10: "opt-mainnet.g.alchemy.com/v2/",
        42161: "arb-mainnet.g.alchemy.com/v2/",
        8453: "base-mainnet.g.alchemy.com/v2/",
        84532: "base-sepolia.g.alchemy.com/v2/"
      }
      const network = networkMap[chainId]
      if (!network) throw new Error(`Unsupported chain for Alchemy: ${chainId}`)
      return `https://${network}${ALCHEMY_API_KEY}`
    }
  },

  ankr: {
    name: 'Ankr',
    key: ANKR_API_KEY,
    priority: 0, // Highest priority (was 1)
    limits: {
      maxBlockRange: 1000, // Much more generous limits
      requestsPerSecond: 1000,
      description: 'High limits, good for scanning'
    },
    getUrl: (chainId: number) => {
      const networkMap: Record<number, string> = {
        1: "rpc.ankr.com/eth",
        11155111: "rpc.ankr.com/eth_sepolia",
        137: "rpc.ankr.com/polygon",
        10: "rpc.ankr.com/optimism",
        42161: "rpc.ankr.com/arbitrum_one",
        8453: "rpc.ankr.com/base"
      }
      const network = networkMap[chainId]

      // Use specific network endpoint if available, otherwise use multichain
      if (network) {
        return `https://${network}/${ANKR_API_KEY}`
      } else {
        // Universal multichain endpoint
        return `https://rpc.ankr.com/multichain/${ANKR_API_KEY}`
      }
    }
  },

  infura: {
    name: 'Infura',
    key: INFURA_API_KEY,
    priority: 2,
    limits: {
      maxBlockRange: 100, // Good middle ground
      requestsPerSecond: 100,
      description: 'Reliable alternative provider'
    },
    getUrl: (chainId: number) => {
      const networkMap: Record<number, string> = {
        1: "mainnet.infura.io",
        11155111: "sepolia.infura.io",
        137: "polygon-mainnet.infura.io",
        10: "optimism-mainnet.infura.io",
        42161: "arbitrum-mainnet.infura.io",
        8453: "base-mainnet.infura.io"
      }
      const network = networkMap[chainId]
      // Infura has limited network support, return false to skip this provider for unsupported networks
      if (!network) return null as any // This will filter it out in getAvailableProviders
      return `https://${network}/v3/${INFURA_API_KEY}`
    }
  },

  public: {
    name: 'Public RPC',
    key: 'public',
    priority: 3,
    limits: {
      maxBlockRange: 50, // Conservative for public endpoints
      requestsPerSecond: 5,
      description: 'No API key required, rate limited'
    },
    getUrl: (chainId: number) => {
      const networkMap: Record<number, string> = {
        1: "https://rpc.ankr.com/eth", // Using Ankr public
        11155111: "https://rpc.sepolia.org",
        137: "https://rpc.ankr.com/polygon",
        10: "https://mainnet.optimism.io",
        42161: "https://arb1.arbitrum.io/rpc",
        8453: "https://mainnet.base.org"
      }
      return networkMap[chainId] || `https://rpc.sepolia.org` // fallback
    }
  }
}

// Get RPC URL with provider selection
export const getRpcUrl = (chain: Chain, providerType?: RpcProviderType): string => {
  if (providerType && SUPPORTED_RPC_PROVIDERS[providerType]) {
    const provider = SUPPORTED_RPC_PROVIDERS[providerType]
    if (provider.key) { // Check if API key is available
      return provider.getUrl(chain.id)
    } else if (providerType === 'public') {
      return provider.getUrl(chain.id)
    }
  }

  // Fallback: Try providers in priority order
  const availableProviders = (Object.keys(SUPPORTED_RPC_PROVIDERS) as RpcProviderType[])
    .filter(type => {
      const provider = SUPPORTED_RPC_PROVIDERS[type]
      return provider.key || type === 'public'
    })
    .sort((a, b) => SUPPORTED_RPC_PROVIDERS[a].priority - SUPPORTED_RPC_PROVIDERS[b].priority)

  for (const providerType of availableProviders) {
    try {
      const provider = SUPPORTED_RPC_PROVIDERS[providerType]
      const url = provider.getUrl(chain.id)
      if (url) return url
    } catch {
      continue
    }
  }

  // Final fallback
  throw new Error(`No RPC URL available for chain: ${chain.name} (${chain.id})`)
}

// Get all available providers for a chain
export const getAvailableProviders = (chainId: number): RpcProviderType[] => {
  return (Object.keys(SUPPORTED_RPC_PROVIDERS) as RpcProviderType[])
    .filter(type => {
      const provider = SUPPORTED_RPC_PROVIDERS[type]
      if (type === 'public') return true
      if (!provider.key) return false
      try {
        const url = provider.getUrl(chainId)
        return url && url !== null
      } catch {
        return false
      }
    })
}

// Health check for providers (can be used for load balancing)
export const checkProviderHealth = async (chainId: number, providerType: RpcProviderType): Promise<boolean> => {
  try {
    const provider = SUPPORTED_RPC_PROVIDERS[providerType]
    const url = provider.getUrl(chainId)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'net_version',
        params: []
      })
    })

    return response.ok
  } catch {
    return false
  }
}
