import { Storage } from '@plasmohq/storage'
import { useUIStore } from './ui-store'
import {
  getSelectedNetwork,
  saveSelectedNetwork,
  getStoredAccounts,
  getSelectedNetworkType,
  saveSelectedNetworkType,
  getPreferredNetworksPerType,
  savePreferredNetworkForType,
  getCustomNetworks,
  updateCustomNetworkLastUsed,
  getCustomNetworkByChainId
} from '~/utils/storage'
import { getChainById, defaultChain } from '~/config/chains'
import type { WalletAccount } from '~/types/account'
import type { CustomNetwork } from '~/types/network'
import { E_NetworkType } from '~/types/network'
import { isMainnetAllowed, getDefaultNetworkType } from '~/utils/environment'

// Initialize Plasmo storage instance
const storage = new Storage()

// Storage keys (matching existing storage.ts)
const NETWORK_KEY = 'wallet_network'
const NETWORK_TYPE_KEY = 'wallet_network_type'
const ACCOUNTS_KEY = 'wallet_accounts'
const CUSTOM_NETWORKS_KEY = 'wallet_custom_networks'

// Storage optimization system to prevent rate limiting
class OptimizedStorageManager {
  private static instance: OptimizedStorageManager
  private writeQueue: Map<string, any> = new Map()
  private writeTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private isProcessing = false

  private readonly DEBOUNCE_MS = 1000 // 1 second debounce for storage writes
  private readonly MAX_BATCH_SIZE = 10 // Process up to 10 writes per batch

  static getInstance(): OptimizedStorageManager {
    if (!OptimizedStorageManager.instance) {
      OptimizedStorageManager.instance = new OptimizedStorageManager()
    }
    return OptimizedStorageManager.instance
  }

  // Debounced set - queues writes and batches them
  async set(key: string, value: any): Promise<void> {
    // Clear any existing timeout for this key
    const existingTimeout = this.writeTimeouts.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Queue the write
    this.writeQueue.set(key, value)

    // Set up debounced execution
    const timeout = setTimeout(() => {
      this.processQueuedWrites()
    }, this.DEBOUNCE_MS)

    this.writeTimeouts.set(key, timeout)
  }

  // Immediate set for critical data (bypasses debouncing)
  async setImmediate(key: string, value: any): Promise<void> {
    try {
      this.writeQueue.delete(key)
      const existingTimeout = this.writeTimeouts.get(key)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        this.writeTimeouts.delete(key)
      }

      await storage.set(key, value)
    } catch (error) {
      console.error(`Critical storage write failed for ${key}:`, error)
      // Retry once for critical data
      setTimeout(async () => {
        try {
          await storage.set(key, value)
        } catch (retryError) {
          console.error(`Critical storage write retry failed for ${key}:`, retryError)
        }
      }, 2000)
    }
  }

  // Process all queued writes in batch
  private async processQueuedWrites(): Promise<void> {
    if (this.isProcessing || this.writeQueue.size === 0) {
      return
    }

    this.isProcessing = true

    try {
      // Process writes in batches to avoid rate limits
      const batchPromises: Promise<void>[] = []

      for (const [key, value] of this.writeQueue) {
        batchPromises.push(
          storage.set(key, value).catch(error => {
            console.error(`Storage write failed for ${key}:`, error)
          })
        )

        // Process in smaller batches to avoid overwhelming
        if (batchPromises.length >= this.MAX_BATCH_SIZE) {
          await Promise.allSettled(batchPromises)
          batchPromises.length = 0 // Clear the array

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Process remaining writes
      if (batchPromises.length > 0) {
        await Promise.allSettled(batchPromises)
      }

    } catch (error) {
      console.error('Batch storage write failed:', error)
    } finally {
      // Clean up processed writes
      this.writeQueue.clear()
      this.writeTimeouts.clear()
      this.isProcessing = false
    }
  }

  // Get immediate access to storage (unchanged)
  async get(key: string): Promise<any> {
    return storage.get(key)
  }

  // Watch storage changes (delegates to storage.watch)
  watch(watchConfig: any): void {
    storage.watch(watchConfig)
  }
}

// Use optimized storage manager
const optimizedStorage = OptimizedStorageManager.getInstance()

// Export for use by other services
export { optimizedStorage }

// Initialize sync between storage and Zustand store
export function initializeStorageSync() {
  // Load initial data from storage on app start
  initializeFromStorage()

  // Set up watchers for storage changes
  setupStorageWatchers()

  // Set up store subscription to save changes back to storage
  setupStoreSubscriptions()
}

// Aliased for compatibility with various naming expectations
export const syncUiStoreWithStorage = initializeStorageSync

// Load initial state from storage
async function initializeFromStorage() {
  try {
    // Load network type first (to know which networks to show)
    let networkType = await getSelectedNetworkType()

    // If mainnet is not allowed but stored type is mainnet, switch to testnet
    if (!isMainnetAllowed() && networkType === E_NetworkType.MAINNET) {
      networkType = E_NetworkType.TESTNET
      // Save the corrected network type
      await saveSelectedNetworkType(networkType)
    }

    useUIStore.getState().setNetworkType(networkType)

    // Load preferred network for this type, or use general selected network
    const preferredNetworks = await getPreferredNetworksPerType()
    const preferredChainId = preferredNetworks[networkType]
    const fallbackChainId = await getSelectedNetwork()

    let chainIdToUse = preferredChainId || fallbackChainId

    // Special handling: If there's no preference for the current network type
    // but we have a currently selected network (from a previous type switch),
    // check if it's a custom network and maintain it
    if (!preferredChainId && !fallbackChainId) {
      const currentNetwork = useUIStore.getState().selectedNetwork
      if (currentNetwork) {
        const customNetwork = await getCustomNetworkByChainId(currentNetwork.id)
        if (customNetwork) {
          // Current network is a custom one, maintain it by saving preference for new type
          chainIdToUse = currentNetwork.id
          await savePreferredNetworkForType(networkType, currentNetwork.id)
        }
      }
    }

    // **CRITICAL FIX**: Ensure we ALWAYS fetch the current network from storage,
    // even if background changes occurred while wallet was closed
    const currentStoredChainId = await getSelectedNetwork()

    // Use the stored network if available, fallback to preference logic
    const finalChainIdToUse = currentStoredChainId || chainIdToUse

    console.log('[Storage Sync] Initializing UI with network:', finalChainIdToUse)

    if (finalChainIdToUse) {
      const customNetwork = await getCustomNetworkByChainId(finalChainIdToUse)
      if (customNetwork) {
        // Convert custom network to chain-like object for Zustand store
        const customNetworkAsChain = {
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
        }
        useUIStore.getState().setSelectedNetwork(customNetworkAsChain)
        console.log('[Storage Sync] Set custom network:', customNetwork.name)
      } else {
        // If not a custom network, check predefined chains
        const chain = getChainById(finalChainIdToUse) || defaultChain
        useUIStore.getState().setSelectedNetwork(chain)
        console.log('[Storage Sync] Set predefined network:', chain.name)
      }
    } else {
      // No chain ID stored, use default
      useUIStore.getState().setSelectedNetwork(defaultChain)
      console.log('[Storage Sync] Using default network')
    }

    // Load accounts
    const accountsData = await getStoredAccounts()
    const activeAccount = accountsData.activeAccountId
      ? accountsData.accounts.find(acc => acc.id === accountsData.activeAccountId)
      : null
    useUIStore.getState().setActiveAccount(activeAccount)
    useUIStore.getState().setAccountsList(accountsData.accounts)
    useUIStore.getState().setHasAccounts(accountsData.accounts.length > 0)

    // Load custom networks
    const customNetworks = await getCustomNetworks()
    useUIStore.getState().setCustomNetworks(customNetworks)
  } catch (error) {
    console.error('Failed to load data from storage:', error)
    // Fallback to defaults
    useUIStore.getState().setSelectedNetwork(defaultChain)
    useUIStore.getState().setNetworkType(E_NetworkType.MAINNET)
  }
}

// Watch for external storage changes (e.g., from other contexts)
function setupStorageWatchers() {
  // Watch network and account changes using Plasmo storage.watch
  storage.watch({
    [NETWORK_KEY]: (change) => {
      const networkData = change.newValue as { selectedChainId: number } | null
      if (networkData?.selectedChainId) {
        // Check if this chain ID corresponds to a custom network first
        getCustomNetworkByChainId(networkData.selectedChainId).then(customNetwork => {
          if (customNetwork) {
            // Convert custom network to chain-like object for Zustand store
            const customNetworkAsChain = {
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
            }
            const currentNetwork = useUIStore.getState().selectedNetwork
            if (currentNetwork.id !== customNetwork.chainId) {
              useUIStore.getState().setSelectedNetwork(customNetworkAsChain)
            }
          } else {
            // If not a custom network, check predefined chains
            const chain = getChainById(networkData.selectedChainId)
            if (chain) {
              const currentNetwork = useUIStore.getState().selectedNetwork
              if (currentNetwork.id !== chain.id) {
                useUIStore.getState().setSelectedNetwork(chain)
              }
            }
          }
        }).catch(error => {
          console.error('Failed to handle network change:', error)
        })
      }
    },
    [NETWORK_TYPE_KEY]: (change) => {
      const newNetworkType = change.newValue as E_NetworkType
      if (newNetworkType) {
        // Only update if it's different to avoid loops
        const currentNetworkType = useUIStore.getState().networkType
        if (currentNetworkType !== newNetworkType) {
          useUIStore.getState().setNetworkType(newNetworkType)
        }
      }
    },
    [ACCOUNTS_KEY]: (change) => {
      const accountsData = change.newValue as {
        accounts: WalletAccount[]
        activeAccountId: string | null
      }
    if (accountsData) {
      const activeAccount = accountsData.activeAccountId
        ? accountsData.accounts.find(acc => acc.id === accountsData.activeAccountId)
        : null
      useUIStore.getState().setActiveAccount(activeAccount)
      useUIStore.getState().setAccountsList(accountsData.accounts)
      useUIStore.getState().setHasAccounts(accountsData.accounts.length > 0)
    }
    },
    [CUSTOM_NETWORKS_KEY]: (change) => {
      const networks = change.newValue as CustomNetwork[] || []
      // Only update if different to avoid loops
      const currentNetworks = useUIStore.getState().customNetworks
      if (JSON.stringify(currentNetworks) !== JSON.stringify(networks)) {
        useUIStore.getState().setCustomNetworks(networks)
      }
    }
  })
}

// Watch store changes and save to storage
function setupStoreSubscriptions() {
  // Subscribe to network changes
  let previousNetworkId: number | null = null
  const unsubscribeNetwork = useUIStore.subscribe(
    (state) => state.selectedNetwork,
    async (selectedNetwork) => {
      // Only trigger on actual user-initiated network changes, not status check updates
      if (previousNetworkId !== selectedNetwork.id) {
        // Save to storage when network changes (avoid triggering during status checks)
        try {
          await saveSelectedNetwork(selectedNetwork.id)

          // Also update preferred network for current type
          const currentType = useUIStore.getState().networkType
          await savePreferredNetworkForType(currentType, selectedNetwork.id)

          // Update custom network last used if this is a custom network (in memory only)
          const customNetworks = useUIStore.getState().customNetworks
          const customNetwork = customNetworks.find(n => n.chainId === selectedNetwork.id)
          if (customNetwork) {
            // Update in-memory state only (don't persist every lastUsed change)
            useUIStore.getState().updateCustomNetworkLastUsed(customNetwork.id)
          }

          previousNetworkId = selectedNetwork.id
        } catch (error) {
          console.error('Failed to save network to storage:', error)
        }
      }
    }
  )

  // Subscribe to network type changes
  const unsubscribeNetworkType = useUIStore.subscribe(
    (state) => state.networkType,
    (networkType) => {
      // Save to storage when network type changes
      saveSelectedNetworkType(networkType).catch((error) => {
        console.error('Failed to save network type to storage:', error)
      })
    }
  )

  // Subscribe to custom networks changes
  const unsubscribeCustomNetworks = useUIStore.subscribe(
    (state) => state.customNetworks,
    async (customNetworks) => {
      // Save to storage when custom networks change (using optimized debounced storage)
      try {
        await optimizedStorage.set(CUSTOM_NETWORKS_KEY, customNetworks)
      } catch (error) {
        console.error('Failed to save custom networks to storage:', error)
      }
    }
  )

  // Return cleanup function
  return () => {
    unsubscribeNetwork()
    unsubscribeNetworkType()
    unsubscribeCustomNetworks()
  }
}
