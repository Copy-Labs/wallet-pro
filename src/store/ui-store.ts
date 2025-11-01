import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Chain } from 'viem'
import {defaultChain, supportedChains} from '~/config/chains'
import type { WalletAccount } from '~/types/account'
import { E_NetworkType, type NetworkType, type CustomNetwork } from '~/types/network'

// Store type definition
interface UIStore {
   // Network state
   selectedNetwork: Chain
   networkStatuses: Map<number, { isOnline: boolean; isChecking: boolean }>
   networkStatus: 'online' | 'offline' | 'checking'
   networkType: NetworkType

   // Custom Network state
   customNetworks: CustomNetwork[]
   customNetworkStatuses: Map<string, 'online' | 'offline' | 'checking'>

   // Chain resolver state
   resolvedChains: Map<number, Chain>
   resolvingChains: Set<number>

   // Account state
   activeAccount: WalletAccount | null
   accountsList: WalletAccount[]

   // Theme state
   theme: 'system' | 'light' | 'dark'

   // Wallet state
   walletLocked: boolean
   hasAccounts: boolean

   // UI preferences
   gasSponsorshipEnabled: boolean

   // Balance refresh trigger (for reactive balance updates)
   balanceVersion: number

   // Network actions
   setSelectedNetwork: (chain: Chain) => void
   setNetworkStatuses: (statuses: Map<number, { isOnline: boolean; isChecking: boolean }>) => void
   updateNetworkStatus: (chainId: number, status: { isOnline: boolean; isChecking: boolean }) => void
   setNetworkStatus: (status: 'online' | 'offline' | 'checking') => void
   setNetworkType: (networkType: NetworkType) => void

   // Custom Network actions
   setCustomNetworks: (networks: CustomNetwork[]) => void
   addCustomNetwork: (network: CustomNetwork) => void
   updateCustomNetwork: (network: CustomNetwork) => void
   removeCustomNetwork: (networkId: string) => void
   setCustomNetworkStatus: (networkId: string, status: 'online' | 'offline' | 'checking') => void
   updateCustomNetworkLastUsed: (networkId: string) => void

   // Chain resolver actions
   getChain: (chainId: number) => Chain // Synchronous - returns from cache or fetches sync
   setResolvedChain: (chainId: number, chain: Chain) => void
   addResolvingChain: (chainId: number) => void
   removeResolvingChain: (chainId: number) => void
   resolveChain: (chainId: number) => Promise<Chain>

   // Account actions
   setActiveAccount: (account: WalletAccount | null) => void
   setAccountsList: (accounts: WalletAccount[]) => void

   // Theme actions
   setTheme: (theme: 'system' | 'light' | 'dark') => void

   // Wallet actions
   setWalletLocked: (locked: boolean) => void
   setHasAccounts: (hasAccounts: boolean) => void

   // UI preferences
   setGasSponsorshipEnabled: (enabled: boolean) => void
   toggleGasSponsorship: () => void

   // Balance actions
   refreshBalances: () => void
}

// Create the store with subscribeWithSelector middleware for optimized subscriptions
export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    selectedNetwork: defaultChain,
    networkStatuses: new Map<number, { isOnline: boolean; isChecking: boolean }>(),
    networkStatus: 'checking',
    networkType: E_NetworkType.MAINNET, // Will be updated by storage sync
    customNetworks: [],
    customNetworkStatuses: new Map(),
    resolvedChains: new Map(),
    resolvingChains: new Set(),
    activeAccount: null,
    accountsList: [],
    theme: 'system',
    walletLocked: false,
    hasAccounts: false,
    gasSponsorshipEnabled: false,
    balanceVersion: 0,

    // Network actions
    setSelectedNetwork: (chain) => set({ selectedNetwork: chain }),
    setNetworkStatuses: (statuses) => set({ networkStatuses: statuses }),
    updateNetworkStatus: (chainId, status) => set((state) => {
      const newStatuses = new Map(state.networkStatuses)
      newStatuses.set(chainId, { isOnline: status.isOnline, isChecking: status.isChecking })
      return { networkStatuses: newStatuses }
    }),
    setNetworkStatus: (networkStatus) => set({ networkStatus }),
    setNetworkType: (networkType) => set({ networkType }),

    // Account actions
    setActiveAccount: (account) => set({ activeAccount: account }),
    setAccountsList: (accounts) => set({ accountsList: accounts }),

    // Theme actions
    setTheme: (theme) => set({ theme }),

    // Wallet actions
    setWalletLocked: (locked) => set({ walletLocked: locked }),
    setHasAccounts: (hasAccounts) => set({ hasAccounts }),

    // UI preferences
    setGasSponsorshipEnabled: (enabled) => set({ gasSponsorshipEnabled: enabled }),
    toggleGasSponsorship: () => set((state) => ({ gasSponsorshipEnabled: !state.gasSponsorshipEnabled })),

    // Custom Network actions
    setCustomNetworks: (networks) => set({ customNetworks: networks }),
    addCustomNetwork: (network) => set((state) => ({
      customNetworks: [...state.customNetworks, network]
    })),
    updateCustomNetwork: (network) => set((state) => ({
      customNetworks: state.customNetworks.map(n => n.id === network.id ? network : n)
    })),
    removeCustomNetwork: (networkId) => set((state) => ({
      customNetworks: state.customNetworks.filter(n => n.id !== networkId)
    })),
    setCustomNetworkStatus: (networkId, status) => set((state) => {
      const newStatuses = new Map(state.customNetworkStatuses)
      newStatuses.set(networkId, status)
      return { customNetworkStatuses: newStatuses }
    }),
    updateCustomNetworkLastUsed: (networkId) => set((state) => ({
      customNetworks: state.customNetworks.map(n =>
        n.id === networkId ? { ...n, lastUsed: Date.now() } : n
      )
    })),

    // Chain resolver actions
    setResolvedChain: (chainId, chain) => set((state) => {
      const newResolved = new Map(state.resolvedChains)
      newResolved.set(chainId, chain)
      return { resolvedChains: newResolved }
    }),
    addResolvingChain: (chainId) => set((state) => {
      const newResolving = new Set(state.resolvingChains)
      newResolving.add(chainId)
      return { resolvingChains: newResolving }
    }),
    removeResolvingChain: (chainId) => set((state) => {
      const newResolving = new Set(state.resolvingChains)
      newResolving.delete(chainId)
      return { resolvingChains: newResolving }
    }),
    resolveChain: async (chainId) => {
      const state = get()

      // Check if already resolved
      if (state.resolvedChains.has(chainId)) {
        return state.resolvedChains.get(chainId)!
      }

      // Check if already resolving
      if (state.resolvingChains.has(chainId)) {
        // Wait for resolution or implement polling
        return state.resolvedChains.get(chainId) || defaultChain
      }

      // Start resolution
      state.addResolvingChain(chainId)

      try {
        // Find custom network
        const customNetwork = state.customNetworks.find(n => n.chainId === chainId)
        if (!customNetwork) {
          throw new Error(`Custom network with chainId ${chainId} not found`)
        }

        // Convert CustomNetwork to Chain format
        const chain: Chain = {
          id: customNetwork.chainId,
          name: customNetwork.name,
          nativeCurrency: customNetwork.currency,
          rpcUrls: { default: { http: [customNetwork.rpcUrl] } },
          blockExplorers: customNetwork.blockExplorerUrl ? {
            default: { name: 'Explorer', url: customNetwork.blockExplorerUrl }
          } : undefined,
          // Add other required Chain properties as needed
        }

        state.setResolvedChain(chainId, chain)
        return chain
      } catch (error) {
        console.error(`Failed to resolve chain ${chainId}:`, error)
        return defaultChain
      } finally {
        state.removeResolvingChain(chainId)
      }
    },
    getChain: (chainId: number) => {
      // Check supported chains first (synchronous)
      const chain = supportedChains.find(chain => chain.id === chainId)
      if (chain) return chain

      // For custom networks, return cached or default
      const cached = get().resolvedChains.get(chainId)
      if (cached) return cached

      // For custom networks, trigger async resolution if not resolved
      const customNetwork = get().customNetworks.find(n => n.chainId === chainId)
      if (customNetwork && !get().resolvedChains.has(chainId)) {
        get().resolveChain(chainId) // Fire and forget
      }

      // Default fallback - in practice, this should trigger async resolution
      console.warn(`[Chain Resolver] Chain ${chainId} not found, returning default`)
      return defaultChain
    },

    // Balance actions
    refreshBalances: () => set((state) => ({ balanceVersion: state.balanceVersion + 1 })),
  }))
)

// Chain resolver hook
export const useChainResolver = () => {
  const { getChain } = useUIStore()

  return {
    getChain
  }
}

// Selectors for optimized re-renders
export const useSelectedNetwork = () => useUIStore((state) => state.selectedNetwork)
export const useNetworkStatuses = () => useUIStore((state) => state.networkStatuses)
export const useNetworkType = () => useUIStore((state) => state.networkType)
export const useCustomNetworks = () => useUIStore((state) => state.customNetworks)
export const useCustomNetworkStatuses = () => useUIStore((state) => state.customNetworkStatuses)
export const useAccounts = () => useUIStore((state) => state.accountsList)
export const useActiveAccount = () => useUIStore((state) => state.activeAccount)
export const useTheme = () => useUIStore((state) => state.theme)
export const useWalletLocked = () => useUIStore((state) => state.walletLocked)
export const useBalanceVersion = () => useUIStore((state) => state.balanceVersion)
