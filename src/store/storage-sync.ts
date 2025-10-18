import { Storage } from '@plasmohq/storage'
import { useUIStore } from './ui-store'
import { getSelectedNetwork, saveSelectedNetwork, getStoredAccounts, getSelectedNetworkType, saveSelectedNetworkType, getPreferredNetworksPerType, savePreferredNetworkForType } from '~/utils/storage'
import { getChainById, defaultChain } from '~/config/chains'
import type { WalletAccount } from '~/types/account'
import { E_NetworkType } from '~/types/network'

// Initialize Plasmo storage instance
const storage = new Storage()

// Storage keys (matching existing storage.ts)
const NETWORK_KEY = 'wallet_network'
const NETWORK_TYPE_KEY = 'wallet_network_type'
const ACCOUNTS_KEY = 'wallet_accounts'

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
    const chain = chainIdToUse ? getChainById(chainIdToUse) || defaultChain : defaultChain
    useUIStore.getState().setSelectedNetwork(chain)

    // Load accounts
    const accountsData = await getStoredAccounts()
    const activeAccount = accountsData.activeAccountId
      ? accountsData.accounts.find(acc => acc.id === accountsData.activeAccountId)
      : null
    useUIStore.getState().setActiveAccount(activeAccount)
    useUIStore.getState().setAccountsList(accountsData.accounts)
    useUIStore.getState().setHasAccounts(accountsData.accounts.length > 0)
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
        const chain = getChainById(networkData.selectedChainId)
        if (chain) {
          // Only update if it's different to avoid loops
          const currentNetwork = useUIStore.getState().selectedNetwork
          if (currentNetwork.id !== chain.id) {
            useUIStore.getState().setSelectedNetwork(chain)
          }
        }
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

  // Return cleanup function
  return () => {
    unsubscribeNetwork()
    unsubscribeNetworkType()
  }
}
