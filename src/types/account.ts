import type { Address, Chain } from "viem"

export interface WalletAccount {
  id: string
  name: string
  address: Address
  privateKey: string // Encrypted in storage
  createdAt: number
  lastUsed: number
  accountType?: 'smart' | 'imported'
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
  usdPrice?: number
  usdValue?: number
  priceChange24h?: number
  coinGeckoId?: string
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

// NFT types
export interface NFTBalance {
  contractAddress: Address
  tokenId: string
  name?: string
  description?: string
  image?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  collection?: {
    name?: string
    floorPrice?: number
  }
  tokenType?: 'ERC721' | 'ERC1155'
  balance?: string // For ERC1155 tokens
}
