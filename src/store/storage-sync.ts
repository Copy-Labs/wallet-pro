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

// Initialize Plasmo storage instance
const storage = new Storage()

// Storage keys (matching existing storage.ts)
const NETWORK_KEY = 'wallet_network'
const NETWORK_TYPE_KEY = 'wallet_network_type'
const ACCOUNTS_KEY = 'wallet_accounts'
const CUSTOM_NETWORKS_KEY = 'wallet_custom_networks'

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
    const networkType = await getSelectedNetworkType()
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

    // Check if chainIdToUse corresponds to a custom network first, just like switchChain
    if (chainIdToUse) {
      const customNetwork = await getCustomNetworkByChainId(chainIdToUse)
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
      } else {
        // If not a custom network, check predefined chains
        const chain = getChainById(chainIdToUse) || defaultChain
        useUIStore.getState().setSelectedNetwork(chain)
      }
    } else {
      // No chain ID stored, use default
      useUIStore.getState().setSelectedNetwork(defaultChain)
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
  const unsubscribeNetwork = useUIStore.subscribe(
    (state) => state.selectedNetwork,
    async (selectedNetwork) => {
      // Save to storage when network changes
      try {
        await saveSelectedNetwork(selectedNetwork.id)

        // Also update preferred network for current type
        const currentType = useUIStore.getState().networkType
        await savePreferredNetworkForType(currentType, selectedNetwork.id)

        // Update custom network last used if this is a custom network
        const customNetworks = useUIStore.getState().customNetworks
        const customNetwork = customNetworks.find(n => n.chainId === selectedNetwork.id)
        if (customNetwork) {
          updateCustomNetworkLastUsed(customNetwork.id)
        }
      } catch (error) {
        console.error('Failed to save network to storage:', error)
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
      // Save to storage when custom networks change
      try {
        // Import the storage set function dynamically to avoid circular imports
        const { Storage } = await import('@plasmohq/storage')
        const storage = new Storage()
        await storage.set(CUSTOM_NETWORKS_KEY, customNetworks)
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
