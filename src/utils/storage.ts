import { Storage } from "@plasmohq/storage"
import type { StoredAccounts, NetworkSettings } from "~/types/account"
import { E_NetworkType, type CustomNetwork } from "~/types/network"

const storage = new Storage()

// Account storage keys
const ACCOUNTS_KEY = "wallet_accounts"
const NETWORK_KEY = "wallet_network"
const NETWORK_TYPE_KEY = "wallet_network_type"
const PREF_NETWORK_PER_TYPE_KEY = "wallet_preferred_networks_per_type"

// Account Management
export async function getStoredAccounts(): Promise<StoredAccounts> {
  const data = await storage.get<StoredAccounts>(ACCOUNTS_KEY)
  return data || { accounts: [], activeAccountId: null }
}

export async function saveAccounts(data: StoredAccounts): Promise<void> {
  await storage.set(ACCOUNTS_KEY, data)
}

export async function getActiveAccountId(): Promise<string | null> {
  const data = await getStoredAccounts()
  return data.activeAccountId
}

export async function setActiveAccountId(accountId: string): Promise<void> {
  const data = await getStoredAccounts()
  data.activeAccountId = accountId
  await saveAccounts(data)
}

// Network Management
export async function getSelectedNetwork(): Promise<number | null> {
  const data = await storage.get<NetworkSettings>(NETWORK_KEY)
  return data?.selectedChainId || null
}

export async function saveSelectedNetwork(chainId: number): Promise<void> {
  await storage.set(NETWORK_KEY, { selectedChainId: chainId })
}

// Network Type Management
export async function getSelectedNetworkType(): Promise<E_NetworkType> {
  const data = await storage.get<E_NetworkType>(NETWORK_TYPE_KEY)
  return data || E_NetworkType.MAINNET // Default to mainnet
}

export async function saveSelectedNetworkType(networkType: E_NetworkType): Promise<void> {
  await storage.set(NETWORK_TYPE_KEY, networkType)
}

// Preferred Network per Type Management
export async function getPreferredNetworksPerType(): Promise<Record<E_NetworkType, number | null>> {
  const data = await storage.get<Record<E_NetworkType, number | null>>(PREF_NETWORK_PER_TYPE_KEY)
  return data || { [E_NetworkType.MAINNET]: null, [E_NetworkType.TESTNET]: null }
}

export async function savePreferredNetworkForType(networkType: E_NetworkType, chainId: number): Promise<void> {
  const current = await getPreferredNetworksPerType()
  current[networkType] = chainId
  await storage.set(PREF_NETWORK_PER_TYPE_KEY, current)
}

// Custom Network Storage Keys
const CUSTOM_NETWORKS_KEY = "wallet_custom_networks"

// Custom Network CRUD Operations
export async function getCustomNetworks(): Promise<CustomNetwork[]> {
  const data = await storage.get<CustomNetwork[]>(CUSTOM_NETWORKS_KEY)
  return data || []
}

export async function saveCustomNetwork(network: CustomNetwork): Promise<void> {
  const networks = await getCustomNetworks()
  const existingIndex = networks.findIndex(n => n.id === network.id)

  if (existingIndex >= 0) {
    networks[existingIndex] = network
  } else {
    networks.push(network)
  }

  await storage.set(CUSTOM_NETWORKS_KEY, networks)
}

export async function updateCustomNetwork(network: CustomNetwork): Promise<void> {
  const networks = await getCustomNetworks()
  const index = networks.findIndex(n => n.id === network.id)

  if (index >= 0) {
    networks[index] = network
    await storage.set(CUSTOM_NETWORKS_KEY, networks)
  }
}

export async function deleteCustomNetwork(networkId: string): Promise<void> {
  const networks = await getCustomNetworks()
  const filteredNetworks = networks.filter(n => n.id !== networkId)
  await storage.set(CUSTOM_NETWORKS_KEY, filteredNetworks)
}

export async function getCustomNetworkById(networkId: string): Promise<CustomNetwork | null> {
  const networks = await getCustomNetworks()
  return networks.find(n => n.id === networkId) || null
}

export async function getCustomNetworkByChainId(chainId: number): Promise<CustomNetwork | null> {
  const networks = await getCustomNetworks()
  return networks.find(n => n.chainId === chainId) || null
}

export async function updateCustomNetworkStatus(networkId: string, status: 'online' | 'offline' | 'checking'): Promise<void> {
  const networks = await getCustomNetworks()
  const network = networks.find(n => n.id === networkId)

  if (network) {
    network.status = status
    await storage.set(CUSTOM_NETWORKS_KEY, networks)
  }
}

export async function updateCustomNetworkLastUsed(networkId: string): Promise<void> {
  const networks = await getCustomNetworks()
  const updatedNetworks = networks.map(network =>
    network.id === networkId
      ? { ...network, lastUsed: Date.now() }
      : network
  )

  // Don't save to storage for every lastUsed update - only update in memory via UI store
  // The UI store handles persisting meaningful changes with optimized debouncing
  return Promise.resolve()
}

// Internal function for when we do need to persist custom networks (used by add/update/remove)
export async function saveCustomNetworksToStorage(networks: CustomNetwork[]): Promise<void> {
  await saveCustomNetworks(networks)
}

// Network Analytics Storage Keys
const NETWORK_ANALYTICS_KEY = "wallet_network_analytics"
const FAVORITE_NETWORKS_KEY = "wallet_favorite_networks"

// Network Analytics Types
export interface NetworkUsageStats {
  networkId: string
  networkName: string
  chainId: number
  totalUses: number
  firstUsed: number
  lastUsed: number
  totalTimeConnected: number // in milliseconds
  averageConnectionTime: number // in milliseconds
  successRate: number // percentage of successful connections
  totalTransactions?: number
  totalValueTransferred?: string // in wei
}

export interface NetworkAnalytics {
  customNetworks: Record<string, NetworkUsageStats>
  predefinedNetworks: Record<number, NetworkUsageStats>
  lastUpdated: number
}

// Favorite Networks Management
export async function getFavoriteNetworks(): Promise<string[]> {
  const data = await storage.get<string[]>(FAVORITE_NETWORKS_KEY)
  return data || []
}

export async function addFavoriteNetwork(networkId: string): Promise<void> {
  const favorites = await getFavoriteNetworks()
  if (!favorites.includes(networkId)) {
    favorites.push(networkId)
    await storage.set(FAVORITE_NETWORKS_KEY, favorites)
  }
}

export async function removeFavoriteNetwork(networkId: string): Promise<void> {
  const favorites = await getFavoriteNetworks()
  const filteredFavorites = favorites.filter(id => id !== networkId)
  await storage.set(FAVORITE_NETWORKS_KEY, filteredFavorites)
}

export async function isFavoriteNetwork(networkId: string): Promise<boolean> {
  const favorites = await getFavoriteNetworks()
  return favorites.includes(networkId)
}

// Network Analytics Management
export async function getNetworkAnalytics(): Promise<NetworkAnalytics> {
  const data = await storage.get<NetworkAnalytics>(NETWORK_ANALYTICS_KEY)
  return data || {
    customNetworks: {},
    predefinedNetworks: {},
    lastUpdated: Date.now()
  }
}

export async function updateNetworkUsageStats(
  networkId: string,
  networkName: string,
  chainId: number,
  isCustom: boolean,
  sessionDuration?: number,
  transactionCount?: number,
  valueTransferred?: string
): Promise<void> {
  const analytics = await getNetworkAnalytics()
  const now = Date.now()

  const targetStats = isCustom ? analytics.customNetworks : analytics.predefinedNetworks
  const key = isCustom ? networkId : chainId

  if (!targetStats[key]) {
    targetStats[key] = {
      networkId,
      networkName,
      chainId,
      totalUses: 0,
      firstUsed: now,
      lastUsed: now,
      totalTimeConnected: 0,
      averageConnectionTime: 0,
      successRate: 100,
      totalTransactions: 0,
      totalValueTransferred: '0'
    }
  }

  const stats = targetStats[key]
  stats.totalUses += 1
  stats.lastUsed = now

  if (sessionDuration) {
    stats.totalTimeConnected += sessionDuration
    stats.averageConnectionTime = stats.totalTimeConnected / stats.totalUses
  }

  if (transactionCount) {
    stats.totalTransactions = (stats.totalTransactions || 0) + transactionCount
  }

  if (valueTransferred) {
    const currentValue = BigInt(stats.totalValueTransferred || '0')
    const newValue = BigInt(valueTransferred)
    stats.totalValueTransferred = (currentValue + newValue).toString()
  }

  analytics.lastUpdated = now
  await storage.set(NETWORK_ANALYTICS_KEY, analytics)
}

export async function recordNetworkConnection(networkId: string, networkName: string, chainId: number, isCustom: boolean): Promise<void> {
  await updateNetworkUsageStats(networkId, networkName, chainId, isCustom)
}

export async function recordNetworkDisconnection(networkId: string, networkName: string, chainId: number, isCustom: boolean, sessionDuration: number): Promise<void> {
  await updateNetworkUsageStats(networkId, networkName, chainId, isCustom, sessionDuration)
}

export async function recordNetworkError(networkId: string, networkName: string, chainId: number, isCustom: boolean): Promise<void> {
  const analytics = await getNetworkAnalytics()
  const targetStats = isCustom ? analytics.customNetworks : analytics.predefinedNetworks
  const key = isCustom ? networkId : chainId

  if (targetStats[key]) {
    const stats = targetStats[key]
    const totalAttempts = stats.totalUses + 1
    stats.successRate = (stats.totalUses / totalAttempts) * 100
  }

  analytics.lastUpdated = Date.now()
  await storage.set(NETWORK_ANALYTICS_KEY, analytics)
}

// Bulk Operations for Custom Networks
export async function exportCustomNetworks(): Promise<string> {
  const networks = await getCustomNetworks()
  const analytics = await getNetworkAnalytics()
  const favorites = await getFavoriteNetworks()

  const exportData = {
    version: "1.0",
    exportDate: Date.now(),
    networks: networks.map(network => ({
      ...network,
      isFavorite: favorites.includes(network.id)
    })),
    analytics: analytics.customNetworks,
    metadata: {
      totalNetworks: networks.length,
      totalFavorites: favorites.length
    }
  }

  return JSON.stringify(exportData, null, 2)
}

export async function importCustomNetworks(jsonData: string, mergeStrategy: 'replace' | 'merge' = 'merge'): Promise<{
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}> {
  try {
    const importData = JSON.parse(jsonData)
    const errors: string[] = []

    if (!importData.networks || !Array.isArray(importData.networks)) {
      throw new Error('Invalid import format: missing networks array')
    }

    if (mergeStrategy === 'replace') {
      // Clear existing networks
      await storage.set(CUSTOM_NETWORKS_KEY, [])
    }

    const existingNetworks = await getCustomNetworks()
    const existingChainIds = new Set(existingNetworks.map(n => n.chainId))

    let imported = 0
    let skipped = 0

    for (const networkData of importData.networks) {
      try {
        // Validate network data
        if (!networkData.name || !networkData.chainId || !networkData.rpcUrl) {
          errors.push(`Invalid network data: missing required fields`)
          continue
        }

        // Check for chain ID conflicts in merge mode
        if (mergeStrategy === 'merge' && existingChainIds.has(networkData.chainId)) {
          // Check if it's the same network or different
          const existingNetwork = existingNetworks.find(n => n.chainId === networkData.chainId)
          if (existingNetwork && existingNetwork.rpcUrl !== networkData.rpcUrl) {
            errors.push(`Chain ID ${networkData.chainId} already exists with different RPC URL`)
            skipped++
            continue
          } else {
            skipped++
            continue
          }
        }

        // Create network object
        const network: CustomNetwork = {
          id: networkData.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: networkData.name,
          chainId: networkData.chainId,
          rpcUrl: networkData.rpcUrl,
          currency: networkData.currency,
          blockExplorerUrl: networkData.blockExplorerUrl,
          isActive: networkData.isActive !== false,
          dateAdded: networkData.dateAdded || Date.now(),
          lastUsed: networkData.lastUsed,
          status: 'offline'
        }

        await saveCustomNetwork(network)
        existingChainIds.add(network.chainId)
        imported++

        // Add to favorites if it was favorited in export
        if (networkData.isFavorite) {
          await addFavoriteNetwork(network.id)
        }

      } catch (error) {
        errors.push(`Failed to import network "${networkData.name}": ${error.message}`)
      }
    }

    // Import analytics if available
    if (importData.analytics && mergeStrategy === 'merge') {
      const currentAnalytics = await getNetworkAnalytics()
      const importedAnalytics = importData.analytics

      // Merge analytics data
      for (const [networkId, stats] of Object.entries(importedAnalytics)) {
        if (currentAnalytics.customNetworks[networkId]) {
          // Merge with existing stats
          const existing = currentAnalytics.customNetworks[networkId]
          existing.totalUses += stats.totalUses
          existing.totalTimeConnected += stats.totalTimeConnected
          existing.totalTransactions = (existing.totalTransactions || 0) + (stats.totalTransactions || 0)
          const currentValue = BigInt(existing.totalValueTransferred || '0')
          const importedValue = BigInt(stats.totalValueTransferred || '0')
          existing.totalValueTransferred = (currentValue + importedValue).toString()
        } else {
          currentAnalytics.customNetworks[networkId] = stats
        }
      }

      await storage.set(NETWORK_ANALYTICS_KEY, currentAnalytics)
    }

    return { success: true, imported, skipped, errors }

  } catch (error) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [`Import failed: ${error.message}`]
    }
  }
}
