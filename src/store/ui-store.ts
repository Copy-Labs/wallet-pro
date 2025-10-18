import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Chain } from 'viem'
import { defaultChain } from '~/config/chains'
import type { WalletAccount } from '~/types/account'
import { E_NetworkType, type NetworkType, type CustomNetwork } from '~/types/network'

// Store type definition
interface UIStore {
  // Network state
  selectedNetwork: Chain
  networkStatuses: Map<number, { chainId: number; isOnline: boolean; isChecking: boolean }>
  networkStatus: 'online' | 'offline' | 'checking'
  networkType: NetworkType

  // Custom Network state
  customNetworks: CustomNetwork[]
  customNetworkStatuses: Map<string, 'online' | 'offline' | 'checking'>

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
  setNetworkStatuses: (statuses: Map<number, { chainId: number; isOnline: boolean; isChecking: boolean }>) => void
  updateNetworkStatus: (chainId: number, status: { chainId: number; isOnline: boolean; isChecking: boolean }) => void
  setNetworkStatus: (status: 'online' | 'offline' | 'checking') => void
  setNetworkType: (networkType: NetworkType) => void

  // Custom Network actions
  setCustomNetworks: (networks: CustomNetwork[]) => void
  addCustomNetwork: (network: CustomNetwork) => void
  updateCustomNetwork: (network: CustomNetwork) => void
  removeCustomNetwork: (networkId: string) => void
  setCustomNetworkStatus: (networkId: string, status: 'online' | 'offline' | 'checking') => void
  updateCustomNetworkLastUsed: (networkId: string) => void

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
    networkStatuses: new Map(),
    networkStatus: 'checking',
    networkType: E_NetworkType.MAINNET, // Will be updated by storage sync
    customNetworks: [],
    customNetworkStatuses: new Map(),
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
      newStatuses.set(chainId, status)
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

    // Balance actions
    refreshBalances: () => set((state) => ({ balanceVersion: state.balanceVersion + 1 })),
  }))
)

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
