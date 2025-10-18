import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Chain } from 'viem'
import { defaultChain } from '~/config/chains'
import type { WalletAccount } from '~/types/account'
import { E_NetworkType, type NetworkType } from '~/types/network'

// Store type definition
interface UIStore {
  // Network state
  selectedNetwork: Chain
  networkStatuses: Map<number, { chainId: number; isOnline: boolean; isChecking: boolean }>
  networkStatus: 'online' | 'offline' | 'checking'
  networkType: NetworkType

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
    networkType: defaultChain.id === 84532 || defaultChain.id === 11155111 ? E_NetworkType.TESTNET : E_NetworkType.MAINNET,
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

    // Balance actions
    refreshBalances: () => set((state) => ({ balanceVersion: state.balanceVersion + 1 })),
  }))
)

// Selectors for optimized re-renders
export const useSelectedNetwork = () => useUIStore((state) => state.selectedNetwork)
export const useNetworkStatuses = () => useUIStore((state) => state.networkStatuses)
export const useNetworkType = () => useUIStore((state) => state.networkType)
export const useAccounts = () => useUIStore((state) => state.accountsList)
export const useActiveAccount = () => useUIStore((state) => state.activeAccount)
export const useTheme = () => useUIStore((state) => state.theme)
export const useWalletLocked = () => useUIStore((state) => state.walletLocked)
export const useBalanceVersion = () => useUIStore((state) => state.balanceVersion)
