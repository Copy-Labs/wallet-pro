// Network type definitions for the wallet
export enum E_NetworkType {
  TESTNET = "testnet",
  MAINNET = "mainnet",
}

export const NetworkTypeList = Object.values(E_NetworkType)

export type NetworkType = E_NetworkType.TESTNET | E_NetworkType.MAINNET

// Custom Network Interface
export interface CustomNetwork {
  id: string
  name: string
  chainId: number
  rpcUrl: string
  currency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrl?: string
  isActive: boolean
  dateAdded: number
  lastUsed?: number
  status: 'online' | 'offline' | 'checking'
}

// Network Configuration Union Type
export type NetworkConfig = {
  id: string
  name: string
  chainId: number
  rpcUrl: string
  currency: {
    name: string
    symbol: string
    decimals: number
  }
  blockExplorerUrl?: string
  isCustom?: boolean
  dateAdded?: number
  lastUsed?: number
  status?: 'online' | 'offline' | 'checking'
}

// Form Data for Custom Network Creation/Editing
export interface CustomNetworkFormData {
  name: string
  chainId: string
  rpcUrl: string
  currencyName: string
  currencySymbol: string
  currencyDecimals: string
  blockExplorerUrl: string
}

// Validation Result Interface
export interface NetworkValidationResult {
  isValid: boolean
  errors: {
    name?: string
    chainId?: string
    rpcUrl?: string
    currencyName?: string
    currencySymbol?: string
    currencyDecimals?: string
    blockExplorerUrl?: string
    general?: string
  }
}
