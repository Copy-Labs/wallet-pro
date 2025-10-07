/**
 * Signing Service
 * Handles message and transaction signing using Alchemy AA
 */

import { getAccountClient, getActiveAccount } from './wallet'
import { getSelectedNetwork } from '~/utils/storage'
import { getChainById, defaultChain } from '~/config/chains'
import { hashMessage, type Hex } from 'viem'

/**
 * Sign a personal message (personal_sign)
 */
export async function signPersonalMessage(
  message: string,
  accountAddress: string
): Promise<string> {
  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) : defaultChain

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Sign the message
    // For personal_sign, we need to hash the message first
    const messageHash = hashMessage(message)
    
    // Use the smart account to sign
    const signature = await client.signMessage({
      message
    })

    return signature
  } catch (error) {
    console.error('Error signing personal message:', error)
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Sign typed data (EIP-712)
 */
export async function signTypedData(
  accountAddress: string,
  typedData: any
): Promise<string> {
  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) : defaultChain

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Parse typed data
    const { domain, types, primaryType, message } = typedData

    // Sign typed data
    const signature = await client.signTypedData({
      domain,
      types,
      primaryType,
      message
    })

    return signature
  } catch (error) {
    console.error('Error signing typed data:', error)
    throw new Error(`Failed to sign typed data: ${error.message}`)
  }
}

/**
 * Sign a transaction (eth_signTransaction)
 */
export async function signTransaction(
  accountAddress: string,
  transaction: any
): Promise<string> {
  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) : defaultChain

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Prepare transaction
    const tx = {
      to: transaction.to as Hex,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: transaction.data as Hex || '0x',
    }

    // Sign transaction (returns user operation hash for AA)
    const userOpHash = await client.sendUserOperation({
      uo: tx
    })

    return userOpHash
  } catch (error) {
    console.error('Error signing transaction:', error)
    throw new Error(`Failed to sign transaction: ${error.message}`)
  }
}

/**
 * Send a transaction (eth_sendTransaction)
 */
export async function sendTransaction(
  accountAddress: string,
  transaction: any
): Promise<string> {
  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) : defaultChain

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Prepare transaction
    const tx = {
      to: transaction.to as Hex,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: transaction.data as Hex || '0x',
    }

    // Send transaction using Alchemy AA
    const userOpHash = await client.sendUserOperation({
      uo: tx
    })

    // Wait for transaction to be mined
    const txReceipt = await client.waitForUserOperationTransaction({
      hash: userOpHash
    })

    return txReceipt.transactionHash
  } catch (error) {
    console.error('Error sending transaction:', error)
    throw new Error(`Failed to send transaction: ${error.message}`)
  }
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  accountAddress: string,
  transaction: any
): Promise<bigint> {
  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) : defaultChain

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Prepare transaction
    const tx = {
      to: transaction.to as Hex,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: transaction.data as Hex || '0x',
    }

    // Estimate gas
    const gasEstimate = await client.estimateGas(tx)

    return gasEstimate
  } catch (error) {
    console.error('Error estimating gas:', error)
    throw new Error(`Failed to estimate gas: ${error.message}`)
  }
}

/**
 * Check if transaction can be sponsored (gasless)
 */
export async function checkSponsorship(
  accountAddress: string,
  transaction: any
): Promise<boolean> {
  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      return false
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) : defaultChain

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Check if gas manager is available
    // This depends on your Alchemy AA configuration
    // For now, return false - you can implement gas sponsorship logic here
    
    return false
  } catch (error) {
    console.error('Error checking sponsorship:', error)
    return false
  }
}

/**
 * Format transaction for display in approval UI
 */
export function formatTransactionForDisplay(transaction: any): {
  to: string
  value: string
  data: string
  estimatedGas?: string
} {
  return {
    to: transaction.to || 'Contract Creation',
    value: transaction.value 
      ? `${(BigInt(transaction.value) / BigInt(10 ** 18)).toString()} ETH`
      : '0 ETH',
    data: transaction.data || '0x',
    estimatedGas: transaction.gas || transaction.gasLimit || 'Unknown'
  }
}

/**
 * Validate transaction parameters
 */
export function validateTransaction(transaction: any): {
  valid: boolean
  error?: string
} {
  if (!transaction.to && !transaction.data) {
    return {
      valid: false,
      error: 'Transaction must have either "to" address or "data"'
    }
  }

  if (transaction.to && !isValidAddress(transaction.to)) {
    return {
      valid: false,
      error: 'Invalid "to" address'
    }
  }

  if (transaction.value && typeof transaction.value !== 'string') {
    return {
      valid: false,
      error: 'Invalid "value" - must be hex string'
    }
  }

  return { valid: true }
}

/**
 * Check if address is valid
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

