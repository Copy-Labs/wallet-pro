/**
 * Service for managing custom ERC-20 tokens
 */

import type { TokenBalance } from "~types/account"
import { Storage } from "@plasmohq/storage"
import type {Address} from "viem";

// Initialize Plasmo Storage
const storage = new Storage()

// Storage key for custom tokens
const CUSTOM_TOKENS_STORAGE_KEY = 'smart-wallet-pro-custom-tokens'

// Storage interface for custom tokens by network
export interface CustomTokensByNetwork {
  [chainId: number]: CustomTokenData[]
}

export interface CustomTokenData {
  address: Address
  symbol: string
  decimals: number
  name?: string
  chainId: number
  addedAt: number
}

/**
 * Get all custom tokens for a specific network
 */
export async function getCustomTokensForNetwork(chainId: number): Promise<CustomTokenData[]> {
  try {
    const allTokens: CustomTokensByNetwork = await storage.get(CUSTOM_TOKENS_STORAGE_KEY)
    return allTokens[chainId] || []
  } catch (error) {
    console.error('Error loading custom tokens:', error)
    return []
  }
}

/**
 * Save a custom token for a specific network
 */
export async function addCustomTokenForNetwork(chainId: number, tokenData: Omit<CustomTokenData, 'chainId' | 'addedAt'>): Promise<void> {
  try {
    const allTokens: CustomTokensByNetwork = await storage.get(CUSTOM_TOKENS_STORAGE_KEY)

    if (!allTokens[chainId]) {
      allTokens[chainId] = []
    }

    // Check if token already exists (by address)
    const existingIndex = allTokens[chainId].findIndex(
      token => token.address.toLowerCase() === tokenData.address.toLowerCase()
    )

    const fullTokenData: CustomTokenData = {
      ...tokenData,
      chainId,
      addedAt: Date.now()
    }

    if (existingIndex >= 0) {
      // Update existing token
      allTokens[chainId][existingIndex] = fullTokenData
    } else {
      // Add new token
      allTokens[chainId].push(fullTokenData)
    }

    await storage.set(CUSTOM_TOKENS_STORAGE_KEY, allTokens)
  } catch (error) {
    console.error('Error saving custom token:', error)
    throw new Error('Failed to save custom token')
  }
}

/**
 * Remove a custom token from a specific network
 */
export async function removeCustomTokenFromNetwork(chainId: number, tokenAddress: string): Promise<void> {
  try {
    const allTokens: CustomTokensByNetwork = await storage.get(CUSTOM_TOKENS_STORAGE_KEY)

    if (!allTokens[chainId]) return

    allTokens[chainId] = allTokens[chainId].filter(
      token => token.address.toLowerCase() !== tokenAddress.toLowerCase()
    )

    await storage.set(CUSTOM_TOKENS_STORAGE_KEY, allTokens)
  } catch (error) {
    console.error('Error removing custom token:', error)
    throw new Error('Failed to remove custom token')
  }
}

/**
 * Get all custom tokens across all networks
 */
export async function getAllCustomTokens(): Promise<CustomTokensByNetwork> {
  try {
    const allTokens: CustomTokensByNetwork = await storage.get(CUSTOM_TOKENS_STORAGE_KEY)
    return allTokens
  } catch (error) {
    console.error('Error loading all custom tokens:', error)
    return {}
  }
}

/**
 * Validate token data before adding
 */
export function validateCustomToken(tokenData: Omit<CustomTokenData, 'chainId' | 'addedAt'>): string | null {
  // Validate address format
  if (!tokenData.address || typeof tokenData.address !== 'string') {
    return 'Invalid address: address is required'
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenData.address)) {
    return 'Invalid address: must be a valid Ethereum address'
  }

  // Validate symbol
  if (!tokenData.symbol || typeof tokenData.symbol !== 'string') {
    return 'Invalid symbol: symbol is required'
  }

  if (tokenData.symbol.length < 2 || tokenData.symbol.length > 10) {
    return 'Invalid symbol: must be 2-10 characters'
  }

  // Validate decimals
  if (!Number.isInteger(tokenData.decimals) || tokenData.decimals < 0 || tokenData.decimals > 18) {
    return 'Invalid decimals: must be an integer between 0 and 18'
  }

  return null // No validation errors
}

/**
 * Convert custom token data to TokenBalance format for display
 */
export function customTokenToTokenBalance(customToken: CustomTokenData): TokenBalance {
  return {
    address: customToken.address,
    symbol: customToken.symbol,
    name: customToken.name || customToken.symbol,
    balance: '0', // Will be fetched when getting balances
    decimals: customToken.decimals,
    // These will be populated when fetching price data
    usdPrice: undefined,
    usdValue: undefined,
    priceChange24h: undefined,
    coinGeckoId: undefined
  }
}

/**
 * Clear all custom tokens (useful for testing or reset)
 */
export async function clearAllCustomTokens(): Promise<void> {
  try {
    await storage.set(CUSTOM_TOKENS_STORAGE_KEY, {})
  } catch (error) {
    console.error('Error clearing custom tokens:', error)
  }
}
