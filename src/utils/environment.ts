/**
 * Environment variable utilities for the wallet
 * Handles safe access to environment variables with proper defaults
 */

/**
 * Check if mainnet functionality is allowed
 * Controlled by PLASMO_PUBLIC_ALLOW_MAINNET environment variable
 */
export function isMainnetAllowed(): boolean {
  // In Plasmo, public env vars are available at runtime
  const allowMainnet = process.env.PLASMO_PUBLIC_ALLOW_MAINNET

  // Default to false for safety - testnet-first approach
  if (allowMainnet === undefined || allowMainnet === null) {
    return false
  }

  // Parse string values to boolean
  if (typeof allowMainnet === 'string') {
    return allowMainnet.toLowerCase() === 'true'
  }

  // Handle boolean values directly
  return Boolean(allowMainnet)
}

/**
 * Get the default network type based on environment settings
 * Returns TESTNET if mainnet is disabled, otherwise MAINNET
 */
export function getDefaultNetworkType(): 'mainnet' | 'testnet' {
  return isMainnetAllowed() ? 'mainnet' : 'testnet'
}

/**
 * Check if a network type is available based on environment settings
 */
export function isNetworkTypeAvailable(networkType: 'mainnet' | 'testnet'): boolean {
  if (networkType === 'testnet') {
    return true // Testnets are always available
  }

  return isMainnetAllowed()
}
