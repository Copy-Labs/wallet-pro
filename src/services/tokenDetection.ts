/**
 * Service for detecting and validating ERC-20 token contracts
 * Implements MetaMask-style token import by contract address
 */

import { createPublicClient, http, type Chain, type Address, formatUnits } from "viem"
import { getAlchemyRpcUrl } from "~/config/alchemy"

export interface TokenMetadata {
  address: Address
  symbol: string
  decimals: number
  name: string
  totalSupply?: string
  isValid: boolean
}

export interface TokenDetectionResult {
  success: boolean
  token?: TokenMetadata
  error?: string
}

/**
 * ERC-20 ABI for metadata functions (name, symbol, decimals, totalSupply)
 */
const ERC20_METADATA_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const

/**
 * Detect ERC-20 token metadata from contract address
 * Implements the MetaMask-style token import experience
 */
export async function detectTokenMetadata(
  contractAddress: Address,
  chain: Chain
): Promise<TokenDetectionResult> {
  try {
    // Validate contract address format
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      return {
        success: false,
        error: "Invalid contract address format"
      }
    }

    // Create public client for the current network
    const client = createPublicClient({
      chain,
      transport: http(getAlchemyRpcUrl(chain))
    })

    // Check if contract exists by calling a simple view function
    let isContract = false
    try {
      const code = await client.getBytecode({ address: contractAddress })
      isContract = code !== undefined && code.length > 2 // "0x" is empty account
    } catch (error) {
      // Contract not found or network error
      console.warn("Failed to check contract code:", error)
    }

    if (!isContract) {
      return {
        success: false,
        error: "Not a valid contract address on this network"
      }
    }

    // Fetch ERC-20 metadata
    const [name, symbol, decimals, totalSupply] = await Promise.allSettled([
      client.readContract({
        address: contractAddress,
        abi: ERC20_METADATA_ABI,
        functionName: 'name'
      }),
      client.readContract({
        address: contractAddress,
        abi: ERC20_METADATA_ABI,
        functionName: 'symbol'
      }),
      client.readContract({
        address: contractAddress,
        abi: ERC20_METADATA_ABI,
        functionName: 'decimals'
      }),
      client.readContract({
        address: contractAddress,
        abi: ERC20_METADATA_ABI,
        functionName: 'totalSupply'
      }).catch(() => undefined) // totalSupply is optional
    ])

    // Validate required fields
    if (symbol.status !== 'fulfilled' || !symbol.value) {
      return {
        success: false,
        error: "Contract does not implement ERC-20 symbol function"
      }
    }

    if (decimals.status !== 'fulfilled' || typeof decimals.value !== 'number') {
      return {
        success: false,
        error: "Contract does not implement ERC-20 decimals function"
      }
    }

    // Validate symbol format
    const symbolStr = String(symbol.value)
    if (!symbolStr || symbolStr.length < 2 || symbolStr.length > 10) {
      return {
        success: false,
        error: "Token symbol must be 2-10 characters"
      }
    }

    // Validate decimals range
    if (decimals.value < 0 || decimals.value > 18) {
      return {
        success: false,
        error: "Token decimals must be between 0 and 18"
      }
    }

    const token: TokenMetadata = {
      address: contractAddress,
      symbol: symbolStr.toUpperCase(),
      decimals: decimals.value,
      name: name.status === 'fulfilled' && name.value ? String(name.value) : symbolStr.toUpperCase(),
      totalSupply: totalSupply.status === 'fulfilled' && totalSupply.value ?
        formatUnits(totalSupply.value as bigint, decimals.value) : undefined,
      isValid: true
    }

    return {
      success: true,
      token
    }

  } catch (error) {
    console.error("Error detecting token metadata:", error)

    // Check for common error types
    if (error instanceof Error) {
      if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
        return {
          success: false,
          error: "Request cancelled"
        }
      }

      if (error.message.includes('network') || error.message.includes('connection')) {
        return {
          success: false,
          error: "Network error. Please check your connection."
        }
      }

      if (error.message.includes('timeout')) {
        return {
          success: false,
          error: "Request timed out. Please try again."
        }
      }
    }

    return {
      success: false,
      error: "Unable to verify token contract. Please check the address and try again."
    }
  }
}

/**
 * Helper function to validate contract address format before attempting detection
 */
export function isValidContractAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}
