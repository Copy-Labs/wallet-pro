import type { CustomNetworkFormData, NetworkValidationResult, CustomNetwork } from "~/types/network"
import { getCustomNetworks, getCustomNetworkByChainId } from "./storage"

// RPC endpoint validation
export async function validateRpcEndpoint(rpcUrl: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: [],
      }),
    })

    if (!response.ok) {
      return { isValid: false, error: 'RPC endpoint is not reachable' }
    }

    const data = await response.json()

    if (data.error) {
      return { isValid: false, error: `RPC error: ${data.error.message || 'Unknown error'}` }
    }

    if (!data.result) {
      return { isValid: false, error: 'Invalid RPC response format' }
    }

    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Chain ID uniqueness validation
export async function validateChainIdUniqueness(chainId: number, excludeNetworkId?: string): Promise<{ isValid: boolean; error?: string }> {
  const customNetworks = await getCustomNetworks()
  const existingNetwork = customNetworks.find(n =>
    n.chainId === chainId && (!excludeNetworkId || n.id !== excludeNetworkId)
  )

  if (existingNetwork) {
    return { isValid: false, error: `Chain ID ${chainId} is already in use by "${existingNetwork.name}"` }
  }

  return { isValid: true }
}

// Network configuration validation
export function validateNetworkConfiguration(formData: CustomNetworkFormData): NetworkValidationResult {
  const errors: NetworkValidationResult['errors'] = {}

  // Name validation
  if (!formData.name.trim()) {
    errors.name = 'Network name is required'
  } else if (formData.name.length < 2) {
    errors.name = 'Network name must be at least 2 characters'
  } else if (formData.name.length > 50) {
    errors.name = 'Network name must be less than 50 characters'
  }

  // Chain ID validation
  const chainIdNum = parseInt(formData.chainId)
  if (!formData.chainId.trim()) {
    errors.chainId = 'Chain ID is required'
  } else if (isNaN(chainIdNum) || chainIdNum <= 0) {
    errors.chainId = 'Chain ID must be a positive number'
  } else if (chainIdNum > Number.MAX_SAFE_INTEGER) {
    errors.chainId = 'Chain ID is too large'
  }

  // RPC URL validation
  if (!formData.rpcUrl.trim()) {
    errors.rpcUrl = 'RPC URL is required'
  } else if (!isValidUrl(formData.rpcUrl)) {
    errors.rpcUrl = 'RPC URL must be a valid URL'
  } else if (!formData.rpcUrl.startsWith('http://') && !formData.rpcUrl.startsWith('https://')) {
    errors.rpcUrl = 'RPC URL must start with http:// or https://'
  }

  // Currency name validation
  if (!formData.currencyName.trim()) {
    errors.currencyName = 'Currency name is required'
  } else if (formData.currencyName.length > 20) {
    errors.currencyName = 'Currency name must be less than 20 characters'
  }

  // Currency symbol validation
  if (!formData.currencySymbol.trim()) {
    errors.currencySymbol = 'Currency symbol is required'
  } else if (formData.currencySymbol.length > 10) {
    errors.currencySymbol = 'Currency symbol must be less than 10 characters'
  } else if (!/^[A-Z]+$/.test(formData.currencySymbol)) {
    errors.currencySymbol = 'Currency symbol must contain only uppercase letters'
  }

  // Currency decimals validation
  const decimalsNum = parseInt(formData.currencyDecimals)
  if (!formData.currencyDecimals.trim()) {
    errors.currencyDecimals = 'Currency decimals is required'
  } else if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
    errors.currencyDecimals = 'Currency decimals must be between 0 and 18'
  }

  // Block explorer URL validation (optional but must be valid if provided)
  if (formData.blockExplorerUrl.trim() && !isValidUrl(formData.blockExplorerUrl)) {
    errors.blockExplorerUrl = 'Block explorer URL must be a valid URL'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// Network connectivity testing
export async function testNetworkConnectivity(network: CustomNetwork): Promise<{ isOnline: boolean; error?: string }> {
  try {
    const validation = await validateRpcEndpoint(network.rpcUrl)

    if (validation.isValid) {
      return { isOnline: true }
    } else {
      return { isOnline: false, error: validation.error }
    }
  } catch (error) {
    return {
      isOnline: false,
      error: `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Helper function to validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Validate existing custom network
export function validateExistingNetwork(network: CustomNetwork): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!network.name?.trim()) {
    errors.push('Network name is required')
  }

  if (!network.chainId || network.chainId <= 0) {
    errors.push('Valid chain ID is required')
  }

  if (!network.rpcUrl?.trim()) {
    errors.push('RPC URL is required')
  } else if (!isValidUrl(network.rpcUrl)) {
    errors.push('RPC URL must be valid')
  }

  if (!network.currency?.name?.trim()) {
    errors.push('Currency name is required')
  }

  if (!network.currency?.symbol?.trim()) {
    errors.push('Currency symbol is required')
  }

  if (network.currency?.decimals === undefined || network.currency.decimals < 0 || network.currency.decimals > 18) {
    errors.push('Currency decimals must be between 0 and 18')
  }

  if (network.blockExplorerUrl && !isValidUrl(network.blockExplorerUrl)) {
    errors.push('Block explorer URL must be valid')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
