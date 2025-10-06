import type { Address, Chain } from "viem"

export interface WalletAccount {
  id: string
  name: string
  address: Address
  privateKey: string // Encrypted in storage
  createdAt: number
  lastUsed: number
}

export interface AccountBalance {
  eth: string
  tokens: TokenBalance[]
}

export interface TokenBalance {
  address: Address
  symbol: string
  name: string
  balance: string
  decimals: number
}

export interface StoredAccounts {
  accounts: WalletAccount[]
  activeAccountId: string | null
}

export interface NetworkSettings {
  selectedChainId: number
}

// Transaction types
export interface Transaction {
  hash: string
  from: Address
  to: Address
  value: string
  gasUsed?: string
  gasPrice?: string
  blockNumber: number
  timestamp: number
  status: 'success' | 'failed' | 'pending'
  chainId: number
  type: 'send' | 'receive'
}

export interface TransactionHistory {
  transactions: Transaction[]
  totalCount: number
}

export interface GasEstimate {
  gasLimit: string
  gasPrice: string
  estimatedCost: string
  estimatedCostUSD: string
}

export interface SponsorshipCheck {
  canSponsor: boolean
  reason?: string
  estimatedCostUSD: string
  sponsoringCostUSD: string
}

// DApp connectivity types
export interface DAppPermission {
  origin: string
  accountId: string
  connectedAt: number
  lastUsed?: number
}

export interface StoredDAppPermissions {
  permissions: DAppPermission[]
}

// Extension messaging types
export interface EthRequestMessage {
  type: "ETH_REQUEST"
  id: string
  request: {
    method: string
    params?: any[]
  }
  origin: string
  tabId?: number
}

export interface EthResponseMessage {
  type: "ETH_RESPONSE"
  id: string
  result?: any
  error?: {
    code: number
    message: string
  }
  tabId?: number
}

export interface ProviderUpdateMessage {
  type: "PROVIDER_UPDATE"
  chainId?: string
  selectedAddress?: string | null
}
