/**
 * Signing Service
 * Handles message and transaction signing using EIP-7702
 */

import { getAccountClient, getActiveAccount } from './wallet'
import { getSelectedNetwork } from '~/utils/storage'
import { getChainById, defaultChain } from '~/config/chains'
import { hashMessage, type Hex, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Universal deployer constants (EIP-2470 Singleton Factory)
const UNIVERSAL_DEPLOYER_ADDRESS = '0x4e59b44847b379578588920cA78FbF26c0B4956C' as Hex

const DEPLOYER_ABI = [
  {
    type: 'function',
    name: 'deploy',
    inputs: [
      { name: '_initCode', type: 'bytes' },
      { name: '_salt', type: 'uint256' }
    ],
    outputs: [{ name: '_createdContract', type: 'address' }],
    stateMutability: 'payable'
  }
] as const

// Helper function to convert bigint to hex string
function toHexValue(value: bigint): string {
  return `0x${value.toString(16)}`
}

/**
 * Sign a personal message (personal_sign)
 */
export async function signPersonalMessage(
  message: string,
  accountAddress: string
): Promise<string> {
  try {
    console.log('[Signing] Personal sign request:', { message, accountAddress })

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    console.log('[Signing] Active account:', account)

    // Get current chain
    const chainId = await getSelectedNetwork()
    console.log('[Signing] Selected network ID:', chainId)

    const chain = (chainId ? getChainById(chainId) : null) || defaultChain
    console.log('[Signing] Using chain:', chain.name, chain.id)

    // Validate chain object
    if (!chain || !chain.id) {
      throw new Error('Invalid chain configuration')
    }

    // Get account client
    console.log('[Signing] Creating account client...')
    const client = await getAccountClient(account.id, chain)
    console.log('[Signing] Account client created:', client.account.address)

    // Sign the message
    console.log('[Signing] Signing message...')
    const signature = await client.signMessage({
      message
    })

    console.log('[Signing] Signature created:', signature)
    return signature
  } catch (error) {
    console.error('[Signing] Error signing personal message:', error)
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Sign a message with eth_sign (legacy method)
 * WARNING: This is a dangerous method as it can sign arbitrary data
 */
export async function signLegacy(
  message: string,
  accountAddress: string
): Promise<string> {
  try {
    console.log('[Signing] Legacy sign request:', { message, accountAddress })

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    console.log('[Signing] Active account:', account)

    // Get current chain
    const chainId = await getSelectedNetwork()
    console.log('[Signing] Selected network ID:', chainId)

    const chain = (chainId ? getChainById(chainId) : null) || defaultChain
    console.log('[Signing] Using chain:', chain.name, chain.id)

    // Validate chain object
    if (!chain || !chain.id) {
      throw new Error('Invalid chain configuration')
    }

    // Get account client
    console.log('[Signing] Creating account client...')
    const client = await getAccountClient(account.id, chain)
    console.log('[Signing] Account client created:', client.account.address)

    // For eth_sign, the message is already hashed (or should be treated as raw data)
    // We'll sign it as-is
    console.log('[Signing] Signing raw message...')
    const signature = await client.signMessage({
      message: { raw: message as Hex }
    })

    console.log('[Signing] Legacy signature created:', signature)
    return signature
  } catch (error) {
    console.error('[Signing] Error signing legacy message:', error)
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Sign typed data (EIP-712) using EIP-7702
 */
export async function signTypedData(
  accountAddress: string,
  typedData: any
): Promise<string> {
  try {
    console.log('[Signing] Typed data sign request (EIP-7702):', { accountAddress })

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Parse typed data if it's a string
    let parsedTypedData = typedData
    if (typeof typedData === 'string') {
      console.log('[Signing] Parsing typed data from string...')
      parsedTypedData = JSON.parse(typedData)
    }

    // Extract typed data components
    const { domain, types, primaryType, message } = parsedTypedData
    console.log('[Signing] Signing with:', { domain, primaryType })

    // For EIP-712 with EIP-7702, use the underlying EOA private key directly
    // The smart account delegates to the EOA, but for typed data, we sign with EOA
    const eoaAccount = privateKeyToAccount(account.privateKey as Hex)

    // Sign typed data directly with the EOA account
    const signature = await eoaAccount.signTypedData({
      domain,
      types,
      primaryType,
      message
    })

    console.log('[Signing] Typed data signature created via EOA')
    return signature
  } catch (error) {
    console.error('[Signing] Error signing typed data with EIP-7702:', error)
    throw new Error(`Failed to sign typed data: ${error.message}`)
  }
}

/**
 * Sign a transaction using EIP-7702 (returns signed transaction data)
 */
export async function signTransaction(
  accountAddress: string,
  transaction: any
): Promise<string> {
  try {
    console.log('[Signing] Sign transaction request (EIP-7702):', { accountAddress, transaction })

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get account client
    const selectedChainId = await getSelectedNetwork()
    const chain = (selectedChainId ? getChainById(selectedChainId) : null) || defaultChain
    const client = await getAccountClient(account.id, chain)

    // Prepare transaction
    const tx = {
      to: transaction.to ? transaction.to as Hex : undefined,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: (transaction.data as Hex) || '0x',
      chainId: chain.id,
      type: 'eip1559', // Use EIP-1559 for modern transaction signing
      gas: transaction.gas ? BigInt(transaction.gas) : undefined,
      gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : undefined,
      maxFeePerGas: transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? BigInt(transaction.maxPriorityFeePerGas) : undefined,
      nonce: transaction.nonce ? parseInt(transaction.nonce) : undefined,
    }

    // Sign the transaction using sendCalls (with delegation if first time on chain)
    const result = await client.sendCalls({
      capabilities: {eip7702Auth: true},
      calls: [{
        to: tx.to,
        value: toHexValue(tx.value),
        data: tx.data,
      }],
      from: accountAddress as Hex,
    })

    console.log('[Signing] Transaction submitted via EIP-7702:', result.preparedCallIds[0])
    return result.preparedCallIds[0]
  } catch (error) {
    console.error('[Signing] Error signing transaction with EIP-7702:', error)
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
    console.log('[Signing] Send transaction request:', { accountAddress, transaction })

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    console.log('[Signing] Active account:', account)

    // Get current chain
    const chainId = await getSelectedNetwork()
    console.log('[Signing] Selected network ID:', chainId)

    const chain = (chainId ? getChainById(chainId) : null) || defaultChain
    console.log('[Signing] Using chain:', chain.name, chain.id)

    // Validate chain object
    if (!chain || !chain.id) {
      throw new Error('Invalid chain configuration')
    }

    // Validate transaction
    console.log('[Signing] Raw transaction object:', JSON.stringify(transaction, null, 2))

    if (!transaction.to && !transaction.data) {
      throw new Error('Transaction must have either "to" address or "data"')
    }

    // Prepare transaction
    const tx = {
      to: transaction.to ? transaction.to as Hex : null,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: (transaction.data as Hex) || '0x',
    }

    console.log('[Signing] Prepared transaction:', {
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    })

    console.log('[Signing] Sending transaction...')

    let txHash: string

    // Handle contract deployment separately
    if (!tx.to) {
      console.log('[Signing] Detected contract deployment')
      txHash = await handleContractDeployment(account, chain, tx)
    } else {
      // Regular transaction with gas sponsorship fallback
      console.log('[Signing] Sending regular transaction with sponsorship fallback...')
      txHash = await sendTransactionWithGasFallback(account, chain, tx)
    }

    console.log('[Signing] Transaction sent:', txHash)
    return txHash
  } catch (error) {
    console.error('[Signing] Error sending transaction:', error)
    throw new Error(`Failed to send transaction: ${error.message}`)
  }
}

/**
 * Handle contract deployment using EIP-7702
 */
async function handleContractDeployment(
  account: any,
  chain: any,
  tx: { to: Hex | null; value: bigint; data: string }
): Promise<string> {
  // Get EIP-7702 account client
  const client = await getAccountClient(account.id, chain)

  console.log('[Signing] Using EIP-7702 contract deployment')

  // For contract deployment in EIP-7702, we can deploy directly
  // The smart account will handle delegation automatically
  const result = await client.sendCalls({
    capabilities: {eip7702Auth: true},
    calls: [{
      // Contract creation (no 'to' address)
      value: toHexValue(tx.value),
      data: tx.data as Hex,
    }],
    from: account.address,
  })

  console.log('[Signing] Contract deployment submitted:', result.preparedCallIds[0])
  return result.preparedCallIds[0]
}

/**
 * Send transaction using EIP-7702
 */
async function sendTransactionWithGasFallback(
  account: any,
  chain: any,
  tx: { to: Hex | null; value: bigint; data: string }
): Promise<string> {
  // Get EIP-7702 account client
  const client = await getAccountClient(account.id, chain)

  console.log('[Signing] Sending transaction with EIP-7702 gas sponsorship...')

  // Use sendCalls with paymaster service for gas sponsorship
  const capabilities: any = { eip7702Auth: true }

  // Add gas sponsorship if configured
  const gasManagerConfig = await (await import("~/config/gasManager")).getGasManagerConfig()
  if (gasManagerConfig?.policyId) {
    capabilities.paymasterService = { policyId: gasManagerConfig.policyId }
  }

  const result = await client.sendCalls({
    capabilities,
    calls: [{
      to: tx.to!,
      value: toHexValue(tx.value),
      data: tx.data as Hex,
    }],
    from: account.address
  })

  console.log('[Signing] Transaction submitted via EIP-7702:', result.preparedCallIds[0])
  return result.preparedCallIds[0]
}

/**
 * Estimate gas for a transaction using EIP-7702
 */
export async function estimateGas(
  accountAddress: string,
  transaction: any
): Promise<bigint> {
  try {
    console.log('[Signing] Estimating gas for EIP-7702 transaction')

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = (chainId ? getChainById(chainId) : null) || defaultChain

    // Create public client for gas estimation (since EIP-7702 client doesn't expose estimateGas)
    const { createPublicClient, http } = await import('viem')
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    })

    // Prepare transaction for estimation
    const tx = {
      to: transaction.to ? transaction.to as Hex : undefined,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: (transaction.data as Hex) || '0x',
      // For estimation, we use the EOA address (since that's what will pay gas initially)
      from: accountAddress as Hex,
    }

    // Estimate gas using public client
    const gasEstimate = await publicClient.estimateGas(tx)

    // Add overhead for EIP-7702 delegation
    const delegationOverhead = 15000n
    const totalGasEstimate = gasEstimate + delegationOverhead

    console.log('[Signing] Gas estimated:', totalGasEstimate.toString())
    return totalGasEstimate
  } catch (error) {
    console.error('[Signing] Error estimating gas with EIP-7702:', error)
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

    // TODO: Check if gas manager is available
    //  This depends on your Alchemy AA configuration
    //  For now, return false - you can implement gas sponsorship logic here
    // client.checkGasSponsorshipEligibility

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
