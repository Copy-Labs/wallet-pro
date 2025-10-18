// Helper function to get current network type from selected chain's metadata
import {useUIStore} from "~store/ui-store";
import {supportedChains, chainMetadata} from "~config/chains";
import type { CustomNetwork, NetworkConfig } from "~/types/network"

export const getNetworkType = (): 'mainnet' | 'testnet' => {
  const selectedNetwork = useUIStore.getState().selectedNetwork
  const metadata = chainMetadata[selectedNetwork.id]
  return metadata?.isTestnet ? "testnet" : "mainnet"
}

// Helper function to get blockchain name
export const getBlockchainName = (): string => {
  const selectedNetwork = useUIStore.getState().selectedNetwork
  const metadata = chainMetadata[selectedNetwork.id]
  return metadata?.shortName || "Unknown"
}

// Helper function to filter chains by network type
export const getChainsByNetworkType = (networkType: 'mainnet' | 'testnet') => {
  return supportedChains.filter(chain => {
    const metadata = chainMetadata[chain.id]
    return networkType === 'testnet' ? metadata?.isTestnet : !metadata?.isTestnet
  })
}

// Helper function to get default chain for network type
export const getDefaultChainForType = (networkType: 'mainnet' | 'testnet') => {
  const chains = getChainsByNetworkType(networkType)
  return chains[0] // Return first chain of the type
}

// Custom Network Helper Functions

// Get all networks (predefined + custom)
export const getAllNetworks = (): NetworkConfig[] => {
  const customNetworks = useUIStore.getState().customNetworks

  // Convert custom networks to NetworkConfig format
  const customNetworkConfigs: NetworkConfig[] = customNetworks.map(network => ({
    id: network.id,
    name: network.name,
    chainId: network.chainId,
    rpcUrl: network.rpcUrl,
    currency: network.currency,
    blockExplorerUrl: network.blockExplorerUrl,
    isCustom: true,
    dateAdded: network.dateAdded,
    lastUsed: network.lastUsed,
    status: network.status
  }))

  return customNetworkConfigs
}

// Get only custom networks
export const getCustomNetworks = (): CustomNetwork[] => {
  return useUIStore.getState().customNetworks
}

// Get network by chain ID (including custom networks)
export const getNetworkByChainId = (chainId: number): NetworkConfig | null => {
  // First check custom networks
  const customNetworks = useUIStore.getState().customNetworks
  const customNetwork = customNetworks.find(n => n.chainId === chainId)

  if (customNetwork) {
    return {
      id: customNetwork.id,
      name: customNetwork.name,
      chainId: customNetwork.chainId,
      rpcUrl: customNetwork.rpcUrl,
      currency: customNetwork.currency,
      blockExplorerUrl: customNetwork.blockExplorerUrl,
      isCustom: true,
      dateAdded: customNetwork.dateAdded,
      lastUsed: customNetwork.lastUsed,
      status: customNetwork.status
    }
  }

  // Then check predefined chains
  const predefinedChain = supportedChains.find(chain => chain.id === chainId)
  if (predefinedChain) {
    const metadata = chainMetadata[chainId]
    return {
      id: `predefined_${chainId}`,
      name: metadata?.name || predefinedChain.name,
      chainId: predefinedChain.id,
      rpcUrl: predefinedChain.rpcUrls.default.http[0],
      currency: {
        name: predefinedChain.nativeCurrency.name,
        symbol: predefinedChain.nativeCurrency.symbol,
        decimals: predefinedChain.nativeCurrency.decimals
      },
      blockExplorerUrl: metadata?.blockExplorerUrl,
      isCustom: false
    }
  }

  return null
}

// Type guard to check if network is custom
export const isCustomNetwork = (network: NetworkConfig): network is CustomNetwork & { isCustom: true } => {
  return network.isCustom === true
}

// Get network status by chain ID
export const getNetworkStatus = (chainId: number): 'online' | 'offline' | 'checking' | null => {
  const networkStatuses = useUIStore.getState().networkStatuses
  const customNetworks = useUIStore.getState().customNetworks
  const customNetworkStatuses = useUIStore.getState().customNetworkStatuses

  // Check if it's a custom network
  const customNetwork = customNetworks.find(n => n.chainId === chainId)
  if (customNetwork) {
    return customNetworkStatuses.get(customNetwork.id) || customNetwork.status
  }

  // Check predefined network status
  return networkStatuses.get(chainId)?.isOnline
    ? 'online'
    : networkStatuses.get(chainId)?.isChecking
    ? 'checking'
    : 'offline'
}

// Get network name by chain ID
export const getNetworkNameByChainId = (chainId: number): string => {
  const network = getNetworkByChainId(chainId)
  return network?.name || `Chain ${chainId}`
}

// Check if chain ID exists in any network (predefined or custom)
export const isChainIdExists = (chainId: number): boolean => {
  return getNetworkByChainId(chainId) !== null
}

// Get networks with their status
export const getNetworksWithStatus = (): (NetworkConfig & { status: 'online' | 'offline' | 'checking' })[] => {
  const customNetworks = useUIStore.getState().customNetworks
  const networkStatuses = useUIStore.getState().networkStatuses
  const customNetworkStatuses = useUIStore.getState().customNetworkStatuses

  // Get custom networks with status
  const customNetworksWithStatus = customNetworks.map(network => ({
    id: network.id,
    name: network.name,
    chainId: network.chainId,
    rpcUrl: network.rpcUrl,
    currency: network.currency,
    blockExplorerUrl: network.blockExplorerUrl,
    isCustom: true as const,
    dateAdded: network.dateAdded,
    lastUsed: network.lastUsed,
    status: customNetworkStatuses.get(network.id) || network.status
  }))

  // Get predefined networks with status
  const predefinedNetworksWithStatus = supportedChains.map(chain => {
    const metadata = chainMetadata[chain.id]
    const status = networkStatuses.get(chain.id)
    const networkStatus: 'online' | 'offline' | 'checking' =
      status?.isOnline ? 'online' :
      status?.isChecking ? 'checking' : 'offline'

    return {
      id: `predefined_${chain.id}`,
      name: metadata?.name || chain.name,
      chainId: chain.id,
      rpcUrl: chain.rpcUrls.default.http[0],
      currency: {
        name: chain.nativeCurrency.name,
        symbol: chain.nativeCurrency.symbol,
        decimals: chain.nativeCurrency.decimals
      },
      blockExplorerUrl: metadata?.blockExplorerUrl,
      isCustom: false as const,
      status: networkStatus
    }
  })

  return [...customNetworksWithStatus, ...predefinedNetworksWithStatus]
}
