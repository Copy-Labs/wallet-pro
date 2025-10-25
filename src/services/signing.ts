/**
 * Signing Service
 * Handles message and transaction signing using Alchemy AA
 */

import { getAccountClient, getActiveAccount } from './wallet'
import { getSelectedNetwork } from '~/utils/storage'
import { getChainById, defaultChain } from '~/config/chains'
import { hashMessage, type Hex, encodeFunctionData } from 'viem'

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
 * Sign typed data (EIP-712)
 */
export async function signTypedData(
  accountAddress: string,
  typedData: any
): Promise<string> {
  try {
    console.log('[Signing] Typed data sign request:', { accountAddress, typedData })
    console.log('[Signing] Typed data type:', typeof typedData)

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = (chainId ? getChainById(chainId) : null) || defaultChain
    console.log('[Signing] Using chain:', chain.name, chain.id)

    // Validate chain object
    if (!chain || !chain.id) {
      throw new Error('Invalid chain configuration')
    }

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Parse typed data if it's a string
    let parsedTypedData = typedData
    if (typeof typedData === 'string') {
      console.log('[Signing] Parsing typed data from string...')
      parsedTypedData = JSON.parse(typedData)
    }

    console.log('[Signing] Parsed typed data:', parsedTypedData)

    // Extract typed data components
    const { domain, types, primaryType, message } = parsedTypedData

    console.log('[Signing] Signing with:', { domain, primaryType, hasTypes: !!types, hasMessage: !!message })

    // For EIP-712, we need to use the underlying EOA signer, not the smart account
    // Smart accounts can't sign typed data directly - the EOA owner signs it
    // Get the EOA signer from the account
    const eoaSigner = client.account.getSigner()

    console.log('[Signing] Using EOA signer for typed data...')

    // Sign typed data with the EOA signer
    const signature = await eoaSigner.signTypedData({
      domain,
      types,
      primaryType,
      message
    })

    console.log('[Signing] Typed data signature created:', signature)
    return signature
  } catch (error) {
    console.error('[Signing] Error signing typed data:', error)
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
    console.log('[Signing] Sign transaction request:', { accountAddress, transaction })

    // Get active account
    const account = await getActiveAccount()
    if (!account || account.address.toLowerCase() !== accountAddress.toLowerCase()) {
      throw new Error('Account not found or mismatch')
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = (chainId ? getChainById(chainId) : null) || defaultChain
    console.log('[Signing] Using chain:', chain.name, chain.id)

    // Validate chain object
    if (!chain || !chain.id) {
      throw new Error('Invalid chain configuration')
    }

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Prepare transaction
    const tx = {
      to: transaction.to ? transaction.to as Hex : null,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: (transaction.data as Hex) || '0x',
    }

    // Sign transaction (returns user operation hash for AA)
    const userOpResult = await client.sendUserOperation({
      uo: {
        target: tx.to!,
        data: tx.data,
        value: tx.value,
      }
    })

    console.log('[Signing] Transaction signed:', userOpResult.hash)
    return userOpResult.hash
  } catch (error) {
    console.error('[Signing] Error signing transaction:', error)
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

    // Get account client
    console.log('[Signing] Creating account client...')
    const client = await getAccountClient(account.id, chain)
    console.log('[Signing] Account client created:', client.account.address)

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

      // Detect account type - safe feature detection
      const isAAClient = typeof (client as any).sendUserOperation === 'function'
      console.log('[Signing] Account type detection:', { isAAClient })

      if (isAAClient) {
        // ✅ AA Path - Use Universal Deployer (existing working implementation)
        console.log('[Signing] Using AA deployment path via Universal Deployer')

        // Encode the deploy call on the universal factory
        const callData = encodeFunctionData({
          abi: DEPLOYER_ABI,
          functionName: 'deploy',
          args: [tx.data as Hex, 0n] // Pass the contract bytecode as init code and salt as 0
        })

        // Send User Operation to the factory
        const userOpResult = await client.sendUserOperation({
          uo: {
            target: UNIVERSAL_DEPLOYER_ADDRESS,
            data: callData,
            value: tx.value,
          },
          account: client.account,
        })

        // Wait for the transaction to complete
        const txReceipt = await client.waitForUserOperationTransaction(userOpResult)

        // Return the transaction hash from the receipt
        txHash = typeof txReceipt === 'string' ? txReceipt : txReceipt.transactionHash

        console.log('[Signing] AA Contract deployment UserOperation sent:', userOpResult.hash)
        console.log('[Signing] AA Transaction completed:', txReceipt)

      } else {
        // 🔄 EOA Path - Direct deployment (for future EOA support)
        console.log('[Signing] EOA deployment requested but EOA client not available')
        throw new Error(
          'Contract deployment with Externally Owned Account (EOA) is not yet supported. ' +
          'Please use a Smart Account for contract deployments.'
        )

        // Future implementation when EOA support is added:
        // const eoaClient = await getEoaWalletClient(account.id, chain)
        // txHash = await eoaClient.sendTransaction({
        //   data: tx.data,
        //   value: tx.value
        // })
      }

    } else {
      // Regular transaction - unchanged
      txHash = await client.sendTransaction({
        to: tx.to,
        value: tx.value,
        data: tx.data,
      } as any)
    }

    console.log('[Signing] Transaction sent:', txHash)
    return txHash
  } catch (error) {
    console.error('[Signing] Error sending transaction:', error)
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
    const chain = (chainId ? getChainById(chainId) : null) || defaultChain

    // Validate chain object
    if (!chain || !chain.id) {
      throw new Error('Invalid chain configuration')
    }

    // Get account client
    const client = await getAccountClient(account.id, chain)

    // Prepare transaction
    const tx = {
      to: transaction.to ? transaction.to as Hex : null,
      value: transaction.value ? BigInt(transaction.value) : 0n,
      data: (transaction.data as Hex) || '0x',
    }

    // Estimate gas
    const gasEstimate = await client.estimateGas(tx)

    return gasEstimate
  } catch (error) {
    console.error('[Signing] Error estimating gas:', error)
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
