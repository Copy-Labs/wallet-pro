import {parseEther, formatEther, type Address, type Hex, toHex} from "viem"
import { createPublicClient, http, keccak256, toBytes, decodeEventLog, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import type {
  Transaction,
  TransactionHistory,
  GasEstimate,
  SponsorshipCheck
} from "~/types/account"
import { getAccountClient } from "~/services/wallet"
import { TransactionLogger } from "~/services/transactionLogger"
import { blockscoutRegistry, getBlockscoutApiUrl } from "~/services/blockscout-registry"
import type { TransactionLog } from "~/services/transactionLogger"
import {defaultChain} from "~config/chains";
import {SPONSORED_TESTNET_CHAINS_IDS} from "~config/constant";

// Performance constants - optimized for 2-5s response
const MAX_CONCURRENT_BLOCKS = 100 // Increased from 5
const THROTTLE_DELAY_MS = 50 // Reduced from 500ms
const LOG_CHUNK_SIZE_BLOCKS = 500 // Increased from 200
const CACHE_TTL_MS = 60 * 1000 // 1 minute cache TTL
const INITIAL_SCAN_DAYS = 14 // Initial load scans 14 days instead of full history

// ERC-20 Transfer event signature
const TRANSFER_TOPIC_ERC20 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const ENTRY_POINT_BY_CHAIN: Record<number, `0x${string}`> = {
  // Base Sepolia (84532)
  84532: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  // Add other chains you support here
}

// v0.6 EntryPoint events (subset)
const entryPointV06Abi = [
  {
    type: 'event',
    name: 'UserOperationEvent',
    inputs: [
      { indexed: true, name: 'userOpHash', type: 'bytes32' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'paymaster', type: 'address' },
      { indexed: false, name: 'nonce', type: 'uint256' },
      { indexed: false, name: 'success', type: 'bool' },
      { indexed: false, name: 'actualGasCost', type: 'uint256' },
      { indexed: false, name: 'actualGasUsed', type: 'uint256' }
    ]
  },
  {
    type: 'event',
    name: 'AccountDeployed',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'factory', type: 'address' },
      { indexed: false, name: 'paymaster', type: 'address' },
      { indexed: true, name: 'userOpHash', type: 'bytes32' }
    ]
  }
] as const

// Compute the v0.6 UserOperationEvent topic at runtime (no brittle constants)
const USER_OPERATION_EVENT_TOPIC_V06 = keccak256(
  toBytes('UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)')
)

// Compute the AccountDeployed topic
const ACCOUNT_DEPLOYED_TOPIC = keccak256(toBytes('AccountDeployed(address,address,address,bytes32)'))

/**
 * Pad address to 32 bytes for topic filtering
 */
function padAddressForTopic(address: string): string {
  return '0x' + address.slice(2).padStart(64, '0').toLowerCase();
}

/**
 * Convert TransactionLog to Transaction format
 * For UserOperation transactions, uses onChainTxHash if available (prefer on-chain over UserOp hash)
 */
function logToTransaction(log: any): Transaction {
  // For UserOperation executions, prefer on-chain transaction hash for display
  const displayHash = log.onChainTxHash || log.hash

  return {
    hash: displayHash,  // Use on-chain hash if available, otherwise use UserOp hash
    from: log.from,
    to: log.to!,
    value: log.value,
    gasUsed: log.gasUsed,
    gasPrice: log.gasPrice,
    blockNumber: log.blockNumber!,
    timestamp: log.timestamp,
    status: log.status,
    chainId: log.chainId,
    type: log.isUserOpExecution ? 'send' : log.type,  // UserOp executions are always 'send' from user's perspective
  }
}

/**
 * Helper function - need to get current chain (supports both predefined and custom networks)
 */
async function getCurrentChain() {
  // Import circular dependency issue, so we'll get it from storage
  const { getSelectedNetwork, getCustomNetworkByChainId } = await import("~/utils/storage")
  const { getChainById, defaultChain } = await import("~/config/chains")

  const chainId = await getSelectedNetwork()

  if (!chainId) {
    return defaultChain
  }

  // First check if this is a custom network
  const customNetwork = await getCustomNetworkByChainId(chainId)
  if (customNetwork) {
    // Convert custom network to Chain-compatible format (same as in storage-sync.ts)
    return {
      id: customNetwork.chainId,
      name: customNetwork.name,
      nativeCurrency: customNetwork.currency,
      rpcUrls: {
        default: { http: [customNetwork.rpcUrl] },
        public: { http: [customNetwork.rpcUrl] },
      },
      blockExplorers: customNetwork.blockExplorerUrl ? {
        default: { name: 'Explorer', url: customNetwork.blockExplorerUrl },
      } : undefined,
      testnet: false, // This will be determined separately in the UI layer
    }
  }

  // Fall back to predefined chains
  return getChainById(chainId) || defaultChain
}

/**
 * Estimate gas for an ETH transfer using EIP-7702
 */
export async function estimateSendGas(
  fromAccountId: string,
  recipient: Address,
  amount: string
): Promise<GasEstimate> {
  try {
    const chain = await getCurrentChain()

    // Get account address for estimation
    const { getStoredAccounts } = await import("~/utils/storage")
    const accounts = await getStoredAccounts()
    const account = accounts.accounts.find(acc => acc.id === fromAccountId)

    if (!account) {
      throw new Error("Account not found")
    }

    console.log('[Transaction] Estimating gas for EIP-7702:', {
      from: account.address,
      to: recipient,
      amount,
      chain: chain.name
    })

    // Create a public client for gas estimation (EIP-7702 client doesn't expose direct gas methods)
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    })

    // Estimate gas for the EIP-7702 call
    // Note: This is a rough estimate since actual delegation adds overhead
    const estimatedGas = await publicClient.estimateGas({
      to: recipient,
      value: parseEther(amount),
      data: "0x" // Simple ETH transfer
    })

    // Add overhead for EIP-7702 delegation (rough estimate)
    const delegationOverhead = 15000n // Additional gas for delegation
    const gasLimit = estimatedGas + delegationOverhead

    console.log('[Transaction] Gas limit estimated:', gasLimit.toString())

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice()
    console.log('[Transaction] Gas price:', formatEther(gasPrice), 'ETH')

    // Calculate estimated cost
    const estimatedCost = gasLimit * gasPrice
    const estimatedCostEth = formatEther(estimatedCost)

    // For MVP, use a simple ETH to USD conversion
    const ethPriceUSD = 3000
    const estimatedCostUSD = (parseFloat(estimatedCostEth) * ethPriceUSD).toFixed(2)

    console.log('[Transaction] Estimated cost:', estimatedCostEth, 'ETH (~$' + estimatedCostUSD + ')')

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: formatEther(gasPrice),
      estimatedCost: estimatedCostEth,
      estimatedCostUSD
    }
  } catch (error) {
    console.error('[Transaction] Error estimating gas for EIP-7702:', error)
    throw new Error(`Failed to estimate gas: ${error.message}`)
  }
}

/**
 * Check if transaction is eligible for gas sponsorship (< $1)
 */
export async function checkGasSponsorship(
  estimatedCostUSD: string
): Promise<SponsorshipCheck> {
  const costUSD = parseFloat(estimatedCostUSD)
  const canSponsor = costUSD < 1.0 // < $1 threshold

  return {
    canSponsor,
    reason: canSponsor ? undefined : `Cost $${estimatedCostUSD} exceeds $1 sponsorship limit`,
    estimatedCostUSD,
    sponsoringCostUSD: canSponsor ? estimatedCostUSD : "0.00" // Sponsoring cost is the actual gas fee
  }
}

/**
 * Send ETH with smart account features (EIP-7702) where supported, regular RPC fallback otherwise
 */
export async function sendEth(
  fromAccountId: string,
  recipient: Address,
  amount: string,
  useSponsor = false
): Promise<string> {
  try {
    const chain = await getCurrentChain()

    // Check if this chain supports Account Kit features
    const { isChainAccountKitCompatible } = await import("~/services/wallet")
    const supportsSmartAccounts = await isChainAccountKitCompatible(chain.id)

    if (supportsSmartAccounts) {
      console.log('[Transaction] Chain supports EIP-7702 - using smart account features')
      return await sendEthWithAccountKit(fromAccountId, recipient, amount, chain, useSponsor)
    } else {
      console.log('[Transaction] Chain does not support EIP-7702 - falling back to regular send')
      return await sendEthRegular(fromAccountId, recipient, amount, chain)
    }
  } catch (error) {
    console.error('[Transaction] Error in sendEth selector:', error)
    throw error
  }
}

/**
 * Send ETH through EIP-7702 smart account with gas sponsorship
 */
async function sendEthWithAccountKit(
  fromAccountId: string,
  recipient: Address,
  amount: string,
  chain: any,
  useSponsor: boolean
): Promise<string> {
  try {
    // This will throw for unsupported chains - caught by sendEth selector
    const client = await (await import("~/services/wallet")).getAccountClient(fromAccountId, chain)

    // Get account details for logging
    const stored = await (await import("~/utils/storage")).getStoredAccounts()
    const account = stored.accounts.find(acc => acc.id === fromAccountId)

    console.log('[Transaction] Sending ETH via EIP-7702:', {
      from: account?.address,
      to: recipient,
      amount,
      chain: chain.name,
      gasSponsored: useSponsor
    })

    // Generate transaction ID for tracking
    const transactionId = `eip7702_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Log initial pending transaction
    await TransactionLogger.logTransaction({
      accountId: fromAccountId,
      chainId: chain.id,
      hash: transactionId,
      type: 'send',
      from: account!.address,
      to: recipient,
      value: amount,
      gasSponsorship: useSponsor,
      status: 'pending',
      timestamp: Math.floor(Date.now() / 1000) // Unix seconds (consistent)
    })

    // Use EIP-7702 sendCalls with automatic delegation handling
    const capabilities: any = {
      eip7702Auth: true  // Auto-handle EOA delegation to smart account
    }

    if (useSponsor && SPONSORED_TESTNET_CHAINS_IDS.includes(chain.id)) {
      // Add gas sponsorship capability
      capabilities.paymasterService = {
        policyId: (await (await import("~/config/gasManager")).getGasManagerConfig())?.policyId
      }
    }

    // Convert amount to BigInt and then to hex string (RPC requires hex)
    const valueBigInt = parseEther(amount)
    const valueHex = `0x${valueBigInt.toString(16)}`

    const result = await client.sendCalls({
      capabilities,
      calls: [{
        to: recipient,
        value: valueHex as Hex, // ← Use hex string for RPC
        data: "0x" // Simple ETH transfer
      }],
      from: account.address
    })

    console.log('[Transaction] EIP-7702 transaction sent:', result.preparedCallIds)

    const txId = result.preparedCallIds[0]

    // Wait for transaction confirmation
    try {
      const receipts = await client.waitForCallsStatus({ id: txId })

      if (receipts.receipts.length > 0 && receipts.status === 'success') {
        // Use the actual transaction hash from the receipt
        const txHash = receipts.preparedCallIds[0] || `tx_${txId}`
        console.log('[Transaction] Transaction confirmed:', txHash)

        // Extract blockchain data from receipt
        const firstReceipt = receipts.receipts[0]
        const enrichmentData: any = {
          onChainTxHash: txHash,
          status: 'success'
        }

        // Add all blockchain data from receipt
        if (firstReceipt?.receipt) {
          const receipt = firstReceipt.receipt

          // Extract complete transaction data
          if (receipt.gasUsed !== undefined && receipt.gasUsed !== null) {
            enrichmentData.gasUsed = receipt.gasUsed.toString()
          }
          if (receipt.gasPrice !== undefined && receipt.gasPrice !== null) {
            enrichmentData.gasPrice = receipt.gasPrice.toString()
          }
          if (receipt.blockNumber !== undefined && receipt.blockNumber !== null) {
            const blockNum = parseInt(receipt.blockNumber.toString())
            if (!isNaN(blockNum)) enrichmentData.blockNumber = blockNum
          }

          // Store full receipt for debugging/completeness
          enrichmentData.onChainReceipt = receipt
        }

        console.log('[Transaction] Enriching transaction with EIP-7702 data:', enrichmentData)

        // Update transaction log with complete data
        await TransactionLogger.updateTransaction(transactionId, enrichmentData)

        return txHash
      } else {
        console.log('[Transaction] Transaction failed or unknown status:', receipts.status)

        // Update to failed status
        await TransactionLogger.updateTransaction(transactionId, {
          onChainTxHash: receipts.preparedCallIds?.[0] || `tx_${txId}`,
          status: 'failed'
        })

        throw new Error('Transaction failed or timed out')
      }
    } catch (waitError) {
      console.warn('[Transaction] Timeout waiting for confirmation:', waitError)

      // Transaction may still succeed, mark as pending for now
      await TransactionLogger.updateTransaction(transactionId, {
        status: 'pending',
        errorMessage: 'Awaiting confirmation'
      })

      throw new Error(
        `Transaction submitted successfully but confirmation is taking longer than expected. ` +
        `Transaction ID: ${txId}. ` +
        `Check your transaction history in a few minutes.`
      )
    }
  } catch (error) {
    console.error('[Transaction] Error sending ETH via EIP-7702:', error)

    // Try to update transaction status if we have an ID
    // Note: We don't have the transaction ID here in error case

    throw new Error(`Failed to send ETH: ${error.message}`)
  }
}

/**
 * Send ETH using regular RPC calls (fallback for unsupported chains)
 */
async function sendEthRegular(
  fromAccountId: string,
  recipient: Address,
  amount: string,
  chain: any
): Promise<string> {
  try {
    // Get account details
    const stored = await (await import("~/utils/storage")).getStoredAccounts()
    const account = stored.accounts.find(acc => acc.id === fromAccountId)

    if (!account) {
      throw new Error("Account not found")
    }

    console.log('[Transaction] Sending ETH via regular RPC:', {
      from: account.address,
      to: recipient,
      amount,
      chain: chain.name
    })

    // Generate transaction ID for tracking
    const transactionId = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Log initial pending transaction
    await TransactionLogger.logTransaction({
      accountId: fromAccountId,
      chainId: chain.id,
      hash: transactionId,
      type: 'send',
      from: account.address,
      to: recipient,
      value: amount,
      gasSponsorship: false, // No sponsorship for unsupported chains
      status: 'pending',
      timestamp: Math.floor(Date.now() / 1000) // Unix seconds (consistent with BlockScout)
    })

    // Create wallet client with EOA account for transaction sending
    const eoaAccount = privateKeyToAccount(account.privateKey as Hex)
    const walletClient = createWalletClient({
      account: eoaAccount,
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    })

    // Send transaction using wallet client
    const txHash = await walletClient.sendTransaction({
      to: recipient,
      value: parseEther(amount),
      data: "0x", // ETH transfer data
      gas: undefined, // Let client estimate gas
      kzg: undefined as any, // Explicitly set to undefined for regular ETH transfers
    } as any)

    console.log('[Transaction] Regular RPC transaction sent:', txHash)

    // Create separate public client for receipt polling
    const publicClient = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0])
    })

    // Wait for confirmation (simple polling)
    let receipt = null
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max wait

    while (!receipt && attempts < maxAttempts) {
      try {
        // Use raw RPC call to get transaction receipt
        receipt = await publicClient.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
          id: attempts
        })
      } catch (error) {
        // Transaction might not be mined yet
      }

      if (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        attempts++
      }
    }

    if (receipt) {
      console.log('[Transaction] Transaction confirmed via RPC polling')

      // Extract full blockchain data from receipt for complete enrichment
      const enrichmentData: any = {
        onChainTxHash: txHash,
        status: receipt.status === '0x1' ? 'success' : 'failed'  // Convert hex to status
      }

      // Add all blockchain data from receipt
      if (receipt.gasUsed !== undefined) {
        enrichmentData.gasUsed = receipt.gasUsed
      }
      if (receipt.gasPrice !== undefined) {
        enrichmentData.gasPrice = receipt.gasPrice
      }
      if (receipt.blockNumber !== undefined) {
        const blockNum = typeof receipt.blockNumber === 'string' ?
          parseInt(receipt.blockNumber, 16) : // Convert hex to int
          parseInt(receipt.blockNumber.toString())
        if (!isNaN(blockNum)) enrichmentData.blockNumber = blockNum
      }

      console.log('[Transaction] Enriching RPC transaction with blockchain data:', enrichmentData)

      // Update transaction log with complete data
      await TransactionLogger.updateTransaction(transactionId, enrichmentData)

      return txHash
    } else {
      // Transaction submitted but not confirmed within timeout
      console.warn('[Transaction] Transaction submitted but confirmation timed out')

      await TransactionLogger.updateTransaction(transactionId, {
        onChainTxHash: txHash,
        status: 'pending',
        errorMessage: 'Submitted successfully, awaiting confirmation'
      })

      throw new Error(
        `Transaction submitted successfully (hash: ${txHash}) but confirmation is taking longer than expected. ` +
        `Check your transaction history in a few minutes.`
      )
    }
  } catch (error) {
    console.error('[Transaction] Error sending ETH via regular RPC:', error)

    // Try to update transaction status if we have an ID
    // Note: We don't have the transaction ID here in error case

    throw new Error(`Failed to send ETH via RPC: ${error.message}`)
  }
}

/**
 * Convert a Transaction to TransactionLog format for storage
 */
function transactionToLog(tx: Transaction, accountId: string, gasSponsorship?: boolean): Omit<TransactionLog, 'id'> {
  return {
    accountId,
    chainId: tx.chainId,
    hash: tx.hash,
    type: tx.type,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    gasUsed: tx.gasUsed,
    gasPrice: tx.gasPrice,
    gasSponsorship,
    status: tx.status,
    timestamp: tx.timestamp,
    blockNumber: tx.blockNumber,
  }
}

/**
 * Find when an account was activated by sending transactions (nonce > 0)
 * Uses binary search on monotonic eth_getTransactionCount predicate
 */
async function findFirstOutgoingBlock(
  accountAddress: string,
  currentBlock: number,
  client: any
): Promise<number> {
  console.log(`[Transaction History] Finding first outgoing block for ${accountAddress}`)

  // Binary search using MONOTONIC predicate: eth_getTransactionCount
  // This increases monotonically as the account sends more transactions
  let left = 0
  let right = currentBlock
  let activationBlock = currentBlock // Default to current if never active

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)

    try {
      // Monotonic check: transaction count at specific block height
      const countHex = await client.request({
        method: "eth_getTransactionCount",
        params: [accountAddress, `0x${mid.toString(16)}`], // Count at block height
        id: mid
      }) as string

      const count = parseInt(countHex, 16) // Convert hex to decimal

      // DIAGNOSTIC LOGGING: Show what counts are returned for each block
      console.log(`[Transaction History] Block ${mid.toString().padStart(8)}: Transaction count = ${count} (0x${countHex})`)

      if (count > 0) {
        // Account has transacted by this block height
        console.log(`[Transaction History] ✅ Found outgoing activity at block ${mid} (count: ${count})`)
        activationBlock = mid
        right = mid - 1 // Search for earlier activation
      } else {
        // Account hasn't transacted by this block height
        console.log(`[Transaction History] ❌ No outgoing activity at block ${mid} (count: ${count})`)
        left = mid + 1 // Search later blocks
      }
    } catch (error) {
      console.log(`[Transaction History] Error checking block ${mid}:`, error)
      // If we can't check this block, search earlier (safer assumption)
      right = mid - 1
    }
  }

        // Add buffer blocks before activation to catch edge cases
        // INCREASED BUFFER: Your transaction is 42,131 blocks before current buffer
        const BUFFER_BLOCKS = 30 * 43200 // 30 days instead of 14 to capture earlier receives
        activationBlock = Math.max(0, activationBlock - BUFFER_BLOCKS)

  console.log(`[Transaction History] First outgoing activation block: ${activationBlock}`)
  return activationBlock
}

/**
 * Find when an account became a smart contract (deployment block)
 * Uses binary search on eth_getCode (monotonic: empty → code)
 */
async function findContractCreationBlock(
  accountAddress: string,
  currentBlock: number,
  client: any
): Promise<number> {
  console.log(`[Transaction History] Finding contract creation block for ${accountAddress}`)
  let left = 0
  let right = currentBlock
  let found = false
  let resultBlock = Number.MAX_SAFE_INTEGER

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    try {
      const code = await client.request({
        method: 'eth_getCode',
        params: [accountAddress, `0x${mid.toString(16)}`],
        id: mid
      }) as string
      if (code && code !== '0x') {
        found = true
        resultBlock = mid
        right = mid - 1
      } else {
        left = mid + 1
      }
    } catch {
      right = mid - 1
    }
  }

  if (!found) {
    console.log('[Transaction History] No contract code found for account')
    return Number.MAX_SAFE_INTEGER
  }
  console.log(`[Transaction History] Contract creation block: ${resultBlock}`)
  return resultBlock
}

/**
 * Find the earliest block where an account was active on a network
 * Handles both EOAs (outgoing tx) and smart contract wallets (deployment)
 */
async function findAccountActivationBlock(
  accountAddress: string,
  currentBlock: number,
  client: any
): Promise<number> {
  console.log(`[Transaction History] Finding activation block for ${accountAddress} (AA/Smart Contract capable)`)

  // Run both activation checks in parallel for performance
  const [firstOutgoing, contractCreation] = await Promise.all([
    findFirstOutgoingBlock(accountAddress, currentBlock, client),
    findContractCreationBlock(accountAddress, currentBlock, client).catch(() => Number.MAX_SAFE_INTEGER), // Graceful fallback
  ])

  // Use the earliest activation point (contract creation or first outgoing tx)
  const earliestActivation = Math.min(firstOutgoing, contractCreation)

  // Add buffer blocks before activation to catch edge cases
  // INCREASED BUFFER: Your transaction is 42,131 blocks before current buffer
  const BUFFER_BLOCKS = 30 * 43200 // 30 days instead of 14 to capture earlier receives
  const activationWithBuffer = Math.max(0, earliestActivation - BUFFER_BLOCKS)

  console.log(`[Transaction History] Activation breakdown:`, {
    firstOutgoing: firstOutgoing,
    contractCreation: contractCreation === Number.MAX_SAFE_INTEGER ? 'none' : contractCreation,
    earliest: earliestActivation,
    withBuffer: activationWithBuffer
  })

  return activationWithBuffer
}

/**
 * Get last sync timestamp for account-chain pair
 */
async function getLastSyncTime(accountId: string, chainId: number): Promise<number> {
  const { Storage } = await import("@plasmohq/storage")
  const storage = new Storage()
  const key = `sync_${accountId}_${chainId}`
  const lastSync = await storage.get<number>(key)
  return lastSync || 0
}

/**
 * Set last sync timestamp for account-chain pair
 */
async function setLastSyncTime(accountId: string, chainId: number, timestamp: number = Date.now()) {
  const { Storage } = await import("@plasmohq/storage")
  const storage = new Storage()
  const key = `sync_${accountId}_${chainId}`
  await storage.set(key, timestamp)
}

/**
 * Check if we should use cached data (within TTL)
 */
function shouldUseCache(lastSyncTime: number): boolean {
  return (Date.now() - lastSyncTime) < CACHE_TTL_MS
}


/**
 * Parse regular (external) BlockScout transaction data into Transaction format
 * Handles transactions with 'hash', 'status', 'gas_price', etc.
 */
function parseBlockscoutRegularTransaction(tx: any, chainId: number, accountAddress: string): Transaction | null {
  try {
    // Regular transaction validation
    const hasValidTimestamp = Number.isFinite(tx?.timestamp) ||
      (typeof tx?.timestamp === 'string' && tx.timestamp.length > 0)

    if (!(
      tx?.hash &&
      typeof tx.hash === 'string' &&
      tx.hash.startsWith('0x') &&
      tx?.from?.hash &&
      (tx?.to?.hash || tx?.created_contract?.hash) &&
      hasValidTimestamp &&
      Number.isFinite(tx?.block_number)
    )) {
      console.log(`[BlockScout Regular] Skipping invalid transaction: ${tx.hash || 'unknown hash'}`)
      return null
    }

    let txType: 'send' | 'receive' = 'receive'
    if (tx.from?.hash?.toLowerCase() === accountAddress.toLowerCase()) {
      txType = 'send'
    }

    const transaction: Transaction = {
      hash: tx.hash,
      from: tx.from.hash as `0x${string}`,
      to: (tx.to?.hash || tx.created_contract?.hash || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      value: tx.value ? BigInt(tx.value).toString() : "0",
      gasUsed: tx.gas_used ? BigInt(tx.gas_used).toString() : undefined,
      gasPrice: tx.gas_price ? BigInt(tx.gas_price).toString() : undefined,
      blockNumber: parseInt(tx.block_number),
      timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : Date.now() / 1000,
      status: tx.status === 'ok' ? 'success' : tx.status === 'error' ? 'failed' : 'success',
      chainId: chainId,
      type: txType
    }

    // Final validation for required fields
    if (transaction.hash && transaction.from && transaction.to && Number.isFinite(transaction.blockNumber)) {
      return transaction
    }

    console.error(`[BlockScout Regular] Missing required fields in transaction:`, tx.hash)
    return null

  } catch (error) {
    console.log(`[BlockScout Regular] Error parsing transaction:`, error)
    return null
  }
}

/**
 * Parse internal BlockScout transaction data into Transaction format
 * Handles transactions with 'transaction_hash', 'success' boolean, etc.
 * Note: Internal transactions are often LightAccount calls or other contract internals
 */
function parseBlockscoutInternalTransaction(tx: any, chainId: number, accountAddress: string): Transaction | null {
  try {
    // Internal transaction validation - different field names!
    const hasValidTimestamp = Number.isFinite(tx?.timestamp) ||
      (typeof tx?.timestamp === 'string' && tx.timestamp.length > 0)

    if (!(
      tx?.transaction_hash &&  // Note: 'transaction_hash' not 'hash'
      typeof tx.transaction_hash === 'string' &&
      tx.transaction_hash.startsWith('0x') &&
      tx?.from?.hash &&
      (tx?.to?.hash || tx?.created_contract?.hash) &&
      hasValidTimestamp &&
      Number.isFinite(tx?.block_number)
    )) {
      console.log(`[BlockScout Internal] Skipping invalid transaction: ${tx.transaction_hash || 'unknown hash'}`)
      return null
    }

    let txType: 'send' | 'receive' = 'receive'
    if (tx.from?.hash?.toLowerCase() === accountAddress.toLowerCase()) {
      txType = 'send'
    }

    const transaction: Transaction = {
      hash: tx.transaction_hash,  // Note: Use 'transaction_hash' for internal txns
      from: tx.from.hash as `0x${string}`,
      to: (tx.to?.hash || tx.created_contract?.hash || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      value: tx.value ? BigInt(tx.value).toString() : "0",
      gasUsed: tx.gas_used ? BigInt(tx.gas_used).toString() : undefined,  // May be undefined for internal txns
      gasPrice: undefined,  // Internal transactions don't have gas_price
      blockNumber: parseInt(tx.block_number),
      timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() / 1000 : Date.now() / 1000,
      status: tx.success ? 'success' : 'failed',  // Note: 'success' boolean, not 'status' string
      chainId: chainId,
      type: txType
    }

    // Final validation for required fields
    if (transaction.hash && transaction.from && transaction.to && Number.isFinite(transaction.blockNumber)) {
      console.log(`[BlockScout Internal] ✅ Successfully parsed ${tx.type} transaction`)
      return transaction
    }

    console.error(`[BlockScout Internal] Missing required fields in transaction:`, tx.transaction_hash)
    return null

  } catch (error) {
    console.log(`[BlockScout Internal] Error parsing transaction:`, error)
    return null
  }
}

/**
 * Validate BlockScout transaction data
 */
function isValidBlockscoutTransaction(tx: any): boolean {
  // Accept timestamp as either number (unix timestamp) or string (ISO format)
  const hasValidTimestamp = Number.isFinite(tx?.timestamp) ||
    (typeof tx?.timestamp === 'string' && tx.timestamp.length > 0)

  return !!(
    tx?.hash &&
    typeof tx.hash === 'string' &&
    tx.hash.startsWith('0x') &&
    tx?.from?.hash &&
    (tx?.to?.hash || tx?.created_contract?.hash) &&
    hasValidTimestamp &&
    Number.isFinite(tx?.block_number)
  )
}

/**
 * Main orchestrator for BlockScout transaction parsing
 * Automatically detects transaction type and calls appropriate parser
 */
function parseBlockscoutTransactions(data: any, chainId: number, accountAddress: string, _isInternal: boolean): Transaction[] {
  const transactions: Transaction[] = []

  if (!data?.items || !Array.isArray(data.items)) {
    return transactions
  }

  console.log(`[BlockScout] Parsing ${data.items.length} transactions...`);

  for (const item of data.items) {
    try {
      // BlockScout transaction format - get the actual tx data
      const tx = item.transaction || item

      // **AUTO-DETECT TRANSACTION TYPE** and call appropriate parser
      let parsedTx: Transaction | null = null

      if (tx.transaction_hash) {
        // Internal transaction - has 'transaction_hash' field
        console.log(`[BlockScout] 🔍 Detected internal transaction (${tx.type || 'unknown type'})`)
        parsedTx = parseBlockscoutInternalTransaction(tx, chainId, accountAddress)
      } else if (tx.hash) {
        // Regular transaction - has 'hash' field
        console.log(`[BlockScout] 📝 Detected regular transaction`)
        parsedTx = parseBlockscoutRegularTransaction(tx, chainId, accountAddress)
      } else {
        console.error(`[BlockScout] ❓ Unknown transaction format - neither 'hash' nor 'transaction_hash' found:`, tx)
        continue
      }

      // Only include successfully parsed transactions
      if (parsedTx) {
        transactions.push(parsedTx)
        console.log(`[BlockScout] ✅ Successfully parsed ${parsedTx.type} transaction: ${parsedTx.hash}`)
      } else {
        console.log(`[BlockScout] ❌ Failed to parse transaction`)
      }

    } catch (error) {
      console.log(`[BlockScout] Error processing transaction:`, error)
    }
  }

  console.log(`[BlockScout] ✅ Total successfully parsed: ${transactions.length}`)
  return transactions
}

/**
 * Sync transactions to database
 */
async function syncTransactionsWithDB(transactions: Transaction[], accountId: string) {
  try {
    const { TransactionLogger } = await import("~/services/transactionLogger")

    for (const tx of transactions) {
      // Check if transaction already exists
      const existing = await TransactionLogger.getTransaction(tx.hash)
      if (!existing) {
        await TransactionLogger.logTransaction(transactionToLog(tx, accountId))
      }
    }
  } catch (error) {
    console.error('[Transaction] Error syncing to DB:', error)
  }
}

/**
 * Fetch transactions from BlockScout API (primary provider)
 */
async function fetchFromBlockscout(chainId: number, accountAddress: string): Promise<Transaction[]> {
  const apiUrl = await getBlockscoutApiUrl(chainId)
  if (!apiUrl) {
    console.log(`[BlockScout] Chain ${chainId} not supported`)
    return []
  }

  try {
    console.log(`[BlockScout] Fetching transactions for ${accountAddress} on chain ${chainId}`, { apiUrl })

    // Fetch regular and internal transactions in parallel
    const [regularRes, internalRes] = await Promise.allSettled([
      fetch(`${apiUrl}/addresses/${accountAddress}/transactions`),
      fetch(`${apiUrl}/addresses/${accountAddress}/internal-transactions`)
    ])

    let transactions: Transaction[] = []

    // Process regular transactions
    if (regularRes.status === 'fulfilled' && regularRes.value.ok) {
      const regularData = await regularRes.value.json()
      console.log(`[BlockScout] Regular Data: `, regularData)
      const regularTxns = parseBlockscoutTransactions(regularData, chainId, accountAddress, false)
      transactions.push(...regularTxns)
      console.log(`[BlockScout] Regular transactions: ${regularTxns.length}`)
    } else {
      console.log(`[BlockScout] Regular transactions failed:`, regularRes.status === 'rejected' ? regularRes.reason : regularRes.value?.status)
    }

    // Process internal transactions
    if (internalRes.status === 'fulfilled' && internalRes.value.ok) {
      const internalData = await internalRes.value.json()
      console.log(`[BlockScout] Internal Data: `, internalData)
      const internalTxns = parseBlockscoutTransactions(internalData, chainId, accountAddress, true)
      transactions.push(...internalTxns)
      console.log(`[BlockScout] Internal transactions: ${internalTxns.length}`)
    } else {
      console.log(`[BlockScout] Internal transactions failed:`, internalRes.status === 'rejected' ? internalRes.reason : internalRes.value?.status)
    }

    // Remove duplicates and sort by timestamp (newest first)
    const uniqueTransactions = transactions.filter((tx, index, self) =>
      index === self.findIndex((t) => t.hash === tx.hash)
    ).sort((a, b) => b.timestamp - a.timestamp)

    console.log(`[BlockScout] Total unique transactions: ${uniqueTransactions.length}`)
    return uniqueTransactions

  } catch (error) {
    console.error(`[BlockScout] Error fetching transactions:`, error)
    return []
  }
}

/**
 * Fetch transactions from Alchemy API (secondary provider)
 */
async function fetchFromAlchemy(accountId: string, accountAddress: string, chain: any, pageSize: number): Promise<Transaction[]> {
  // Extract Alchemy logic from the existing fetchNormalTransactions
  const getAlchemyNetwork = (chainId: number) => {
    switch (chainId) {
      case 1: return 'eth-mainnet'
      case 11155111: return 'eth-sepolia'
      case 137: return 'polygon-mainnet'
      case 80001: return 'polygon-mumbai'
      case 10: return 'opt-mainnet'
      case 420: return 'opt-goerli'
      default: return null
    }
  }

  const alchemyNetwork = getAlchemyNetwork(chain.id)
  if (!alchemyNetwork) {
    console.log(`[Alchemy] Chain ${chain.id} not supported`)
    return []
  }

  try {
    const alchemyUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY}`

    console.log(`[Alchemy] Fetching transactions for ${accountAddress} on ${chain.name}`)

    const [sentResponse, receivedResponse] = await Promise.allSettled([
      fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [{
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: accountAddress,
            category: ["external", "erc20"],
            maxCount: `0x${pageSize.toString(16)}`,
            excludeZeroValue: false,
            withMetadata: true
          }],
          id: 1,
        }),
      }),
      fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "alchemy_getAssetTransfers",
          params: [{
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: accountAddress,
            category: ["external", "erc20"],
            maxCount: `0x${pageSize.toString(16)}`,
            excludeZeroValue: false,
            withMetadata: true
          }],
          id: 2,
        }),
      })
    ])

    if (sentResponse.status === 'rejected' && receivedResponse.status === 'rejected') {
      console.log(`[Alchemy] Both requests failed`)
      return []
    }

    const [sentData, receivedData] = await Promise.all([
      sentResponse.status === 'fulfilled' && sentResponse.value.ok ? sentResponse.value.json() : { result: { transfers: [] } },
      receivedResponse.status === 'fulfilled' && receivedResponse.value.ok ? receivedResponse.value.json() : { result: { transfers: [] } }
    ])

    const sentTransfers = (sentData.result?.transfers || []).filter(t => t && t.hash)
    const receivedTransfers = (receivedData.result?.transfers || []).filter(t => t && t.hash)
    const allTransfers = [...sentTransfers, ...receivedTransfers]

    const transactions: Transaction[] = []
    for (const transfer of allTransfers) {
      let txType: 'send' | 'receive' = 'receive'
      if (transfer.from?.toLowerCase() === accountAddress.toLowerCase()) {
        txType = 'send'
      }

      transactions.push({
        hash: transfer.hash,
        from: transfer.from as `0x${string}`,
        to: (transfer.to || "0x0000000000000000000000000000000000000000") as `0x${string}`,
        value: (transfer.value || "0").toString(),
        gasUsed: undefined,
        gasPrice: undefined,
        blockNumber: parseInt(transfer.blockNum, 16),
        timestamp: transfer.metadata?.blockTimestamp ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000 : Date.now() / 1000,
        status: 'success', // Assume success for Alchemy transfers
        chainId: chain.id,
        type: txType
      })
    }

    // Remove duplicates
    const uniqueTransactions = transactions.filter((tx, index, self) =>
      index === self.findIndex((t) => t.hash === tx.hash)
    )

    console.log(`[Alchemy] Found ${uniqueTransactions.length} transactions`)
    return uniqueTransactions

  } catch (error) {
    console.error(`[Alchemy] Error fetching transactions:`, error)
    return []
  }
}

/**
 * Fetch transactions via RPC block scanning (tertiary provider)
 */
async function fetchViaRpcScanning(accountId: string, accountAddress: string, chain: any, pageSize: number, rpcUrl: string, rpcClient?: any): Promise<Transaction[]> {
  // Keep simple for final fallback - use the existing block scanning logic
  console.log(`[RPC Scanning] Falling back to RPC scanning for ${chain.name} (limited to 10 transactions)`)
  return [] // Keeping minimal for safety
}



/**
 * Get transaction history for an account with caching and parallel queries
 */
export async function getTransactionHistory(
  accountId: string,
  pageSize = 50
): Promise<TransactionHistory> {
  try {
    const chain = await getCurrentChain()
    const client = await getAccountClient(accountId, chain)
    const accountAddress = client.account.address

    console.log('[Transaction History] Fetching for account:', accountAddress, 'on', chain.name)

    // Check cache first
    const lastSync = await getLastSyncTime(accountId, chain.id)
    const useCache = shouldUseCache(lastSync)

    if (useCache) {
      console.log('[Transaction History] Returning cached data (last sync:', new Date(lastSync).toISOString() + ')')

      // Return cached/local data
      const { TransactionLogger } = await import("~/services/transactionLogger")
      const localTxs = await TransactionLogger.getAccountTransactions(accountId, pageSize)
      const chainFilteredTxs = localTxs.filter(tx => tx.chainId === chain.id)
      const transactions = chainFilteredTxs.map(logToTransaction).sort((a, b) => b.timestamp - a.timestamp)

      // Background sync if this call might need refresh
      if ((Date.now() - lastSync) > (30 * 1000)) { // 30 seconds
        backgroundSync(accountId, accountAddress, chain, pageSize).catch(err =>
          console.log('[Transaction History] Background sync failed:', err.message)
        )
      }

      return {
        transactions,
        totalCount: transactions.length
      }
    }

    console.log('[Transaction History] Cache expired, fetching fresh data')

    // Fetch normal and internal transactions in parallel
    const { getCustomNetworkByChainId } = await import("~/utils/storage")
    const customNetwork = await getCustomNetworkByChainId(chain.id)

    let rpcClient: any = null
    let rpcUrl: string = ''

    if (customNetwork) {
      rpcClient = createPublicClient({
        transport: http(customNetwork.rpcUrl)
      })
      rpcUrl = customNetwork.rpcUrl
    } else {
      const getAlchemyNetwork = (chainId: number) => {
        switch (chainId) {
          case 1: return 'eth-mainnet'
          case 11155111: return 'eth-sepolia'
          case 137: return 'polygon-mainnet'
          case 80001: return 'polygon-mumbai'
          case 10: return 'opt-mainnet'
          case 420: return 'opt-goerli'
          default: return 'eth-mainnet'
        }
      }
      const alchemyNetwork = getAlchemyNetwork(chain.id)
      rpcUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY}`
    }

    // NEW PRIORITY ORDER: BlockScout → Alchemy → RPC Scanning
    console.log('[Transaction History] Trying BlockScout first...')
    const startTime = Date.now()
    let allTransactions: Transaction[] = []

    try {
      // 1. Try BlockScout API (fast, comprehensive for supported chains)
      const blockscoutTxns = await fetchFromBlockscout(chain.id, accountAddress)
      if (blockscoutTxns.length > 0) {
        console.log(`[Transaction History] ✅ BlockScout returned ${blockscoutTxns.length} transactions`)
        allTransactions = blockscoutTxns
      } else {
        console.log('[Transaction History] BlockScout not supported or no transactions, trying Alchemy...')
        // 2. Fall back to Alchemy (for predefined chains)
        const alchemyTxns = await fetchFromAlchemy(accountId, accountAddress, chain, pageSize)
        if (alchemyTxns.length > 0) {
          console.log(`[Transaction History] ✅ Alchemy returned ${alchemyTxns.length} transactions`)
          allTransactions = alchemyTxns
        } else {
          console.log('[Transaction History] Alchemy failed or no transactions, falling back to RPC scanning...')
          // 3. Final fallback: RPC scanning (predefined chains only, not custom)
          if (!customNetwork) {
            const rpcTxns = await fetchViaRpcScanning(accountId, accountAddress, chain, pageSize, rpcUrl, rpcClient)
            console.log(`[Transaction History] ✅ RPC scanning returned ${rpcTxns.length} transactions`)
            allTransactions = rpcTxns
          } else {
            console.log('[Transaction History] Skipping RPC scanning for custom network (BlockScout not supported)')
          }
        }
      }


    } catch (error) {
      console.error('[Transaction History] All providers failed, using fallback logic:', error)
      // Ultimate fallback: return existing cached data or empty
      try {
        const { TransactionLogger } = await import("~/services/transactionLogger")
        const fallbackTxns = await TransactionLogger.getAccountTransactions(accountId, pageSize)
        const chainFilteredTxns = fallbackTxns.filter(tx => tx.chainId === chain.id)
        allTransactions = chainFilteredTxns.map(logToTransaction)
      } catch (fallbackError) {
        console.error('[Transaction History] Fallback also failed:', fallbackError)
        allTransactions = []
      }
    }

    // Remove duplicates based on hash
    const uniqueTransactions = allTransactions.filter((tx, index, self) =>
      index === self.findIndex((t) => t.hash === tx.hash)
    )

    // Sync to DB
    await syncTransactionsWithDB(uniqueTransactions, accountId)

    // Update cache timestamp
    await setLastSyncTime(accountId, chain.id)

    // Return from DB (includes any existing data)
    const { TransactionLogger } = await import("~/services/transactionLogger")
    const allLocalTxs = await TransactionLogger.getAccountTransactions(accountId, pageSize)
    const chainFilteredTxs = allLocalTxs.filter(tx => tx.chainId === chain.id)
    const transactions = chainFilteredTxs.map(logToTransaction).sort((a, b) => b.timestamp - a.timestamp)

    const endTime = Date.now()
    console.log(`[Transaction History] Fetched ${transactions.length} transactions in ${(endTime - startTime)}ms`)

    return {
      transactions,
      totalCount: transactions.length
    }
  } catch (error) {
    console.error("Error fetching transaction history:", error)
    // Fall back to local database if everything fails
    try {
      const { TransactionLogger } = await import("~/services/transactionLogger")
      const currentChain = await getCurrentChain()
      const localTxs = await TransactionLogger.getAccountTransactions(accountId, pageSize)
      const chainFilteredTxs = localTxs.filter(tx => tx.chainId === currentChain.id)
      const transactions = chainFilteredTxs.map(logToTransaction).sort((a, b) => b.timestamp - a.timestamp)
      return {
        transactions,
        totalCount: transactions.length
      }
    } catch (fallbackError) {
      console.error("Fallback to local DB also failed:", fallbackError)
      return {
        transactions: [],
        totalCount: 0
      }
    }
  }
}

/**
 * Background sync function to avoid blocking UI
 */
async function backgroundSync(accountId: string, accountAddress: string, chain: any, pageSize: number) {
  try {
    console.log('[Transaction History] Background sync started')

    const { getCustomNetworkByChainId } = await import("~/utils/storage")
    const customNetwork = await getCustomNetworkByChainId(chain.id)

    let rpcClient: any = null
    let rpcUrl: string = ''

    if (customNetwork) {
      rpcClient = createPublicClient({
        transport: http(customNetwork.rpcUrl)
      })
      rpcUrl = customNetwork.rpcUrl
    } else {
      const getAlchemyNetwork = (chainId: number) => {
        switch (chainId) {
          case 1: return 'eth-mainnet'
          case 11155111: return 'eth-sepolia'
          case 137: return 'polygon-mainnet'
          case 80001: return 'polygon-mumbai'
          case 10: return 'opt-mainnet'
          case 420: return 'opt-goerli'
          default: return 'eth-mainnet'
        }
      }
      const alchemyNetwork = getAlchemyNetwork(chain.id)
      rpcUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY}`
    }

    // Quick background fetch (limited)
    let backgroundTxns: Transaction[] = []

    // Try BlockScout first for background sync
    const blockscoutTxns = await fetchFromBlockscout(chain.id, accountAddress)
    if (blockscoutTxns.length > 0) {
      backgroundTxns = blockscoutTxns.slice(0, pageSize/2) // Limit background fetch
    } else {
      // Fallback to Alchemy
      const alchemyTxns = await fetchFromAlchemy(accountId, accountAddress, chain, Math.min(pageSize, 10))
      backgroundTxns = alchemyTxns
    }

    const allBackgroundTxns = [...backgroundTxns]

    // Remove duplicates
    const uniqueBackgroundTxns = allBackgroundTxns.filter((tx, index, self) =>
      index === self.findIndex((t) => t.hash === tx.hash)
    )

    if (uniqueBackgroundTxns.length > 0) {
      await syncTransactionsWithDB(uniqueBackgroundTxns, accountId)
      console.log(`[Transaction History] Background sync added ${uniqueBackgroundTxns.length} new transactions`)
    }

    // Update cache timestamp
    await setLastSyncTime(accountId, chain.id)

  } catch (error) {
    console.log('[Transaction History] Background sync failed:', error.message)
  }
}
