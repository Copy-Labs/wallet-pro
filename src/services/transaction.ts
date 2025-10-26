import {parseEther, formatEther, type Address, type Hex} from "viem"
import { createPublicClient, http, keccak256, toBytes, decodeEventLog } from "viem"
import type {
  Transaction,
  TransactionHistory,
  GasEstimate,
  SponsorshipCheck
} from "~/types/account"
import { getAccountClient } from "~/services/wallet"
import { TransactionLogger } from "~/services/transactionLogger"
import type { TransactionLog } from "~/services/transactionLogger"

// Performance constants - optimized for 2-5s response
const MAX_CONCURRENT_BLOCKS = 100 // Increased from 5
const THROTTLE_DELAY_MS = 50 // Reduced from 500ms
const LOG_CHUNK_SIZE_BLOCKS = 500 // Increased from 200
const INTERNAL_TRACE_LIMIT = 20 // Limit internal txn tracing to recent 20 txns
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
 */
function logToTransaction(log: any): Transaction {
  return {
    hash: log.hash,
    from: log.from,
    to: log.to!,
    value: log.value,
    gasUsed: log.gasUsed,
    gasPrice: log.gasPrice,
    blockNumber: log.blockNumber!,
    timestamp: log.timestamp,
    status: log.status,
    chainId: log.chainId,
    type: log.type,
  }
}

// Helper function - need to get current chain
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
 * Estimate gas for an ETH transfer
 */
export async function estimateSendGas(
  fromAccountId: string,
  recipient: Address,
  amount: string
): Promise<GasEstimate> {
  try {
    const chain = await getCurrentChain()
    const client = await getAccountClient(fromAccountId, chain)

    console.log('[Transaction] Estimating gas for:', {
      from: client.account.address,
      to: recipient,
      amount,
      chain: chain.name
    })

    // Estimate gas for a simple ETH transfer
    const gasLimit = await client.estimateGas({
      to: recipient,
      value: parseEther(amount)
    })

    console.log('[Transaction] Gas limit estimated:', gasLimit.toString())

    // Get current gas price
    const gasPrice = await client.getGasPrice()

    console.log('[Transaction] Gas price:', formatEther(gasPrice), 'ETH')

    // Calculate estimated cost
    const estimatedCost = gasLimit * gasPrice
    const estimatedCostEth = formatEther(estimatedCost)

    // For MVP, use a simple ETH to USD conversion (in reality, you'd use price API)
    const ethPriceUSD = 3000 // Approximate ETH price, should be from API
    const estimatedCostUSD = (parseFloat(estimatedCostEth) * ethPriceUSD).toFixed(2)

    console.log('[Transaction] Estimated cost:', estimatedCostEth, 'ETH (~$' + estimatedCostUSD + ')')

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: formatEther(gasPrice),
      estimatedCost: estimatedCostEth,
      estimatedCostUSD
    }
  } catch (error) {
    console.error('[Transaction] Error estimating gas:', error)
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
 * Send ETH through smart account with optional sponsorship
 */
export async function sendEth(
  fromAccountId: string,
  recipient: Address,
  amount: string,
  useSponsor = false
): Promise<string> {
  let transactionId: number | undefined
  let knownTxHash: string | undefined

  try {
    const chain = await getCurrentChain()
    const client = await getAccountClient(fromAccountId, chain)

    console.log('[Transaction] Sending ETH:', {
      from: client.account.address,
      to: recipient,
      amount,
      chain: chain.name,
      gasSponsored: useSponsor
    })

    // Log transaction attempt
    transactionId = await TransactionLogger.logTransaction({
      accountId: fromAccountId,
      chainId: chain.id,
      hash: '', // Will be filled in when UO hash is available
      type: 'send',
      from: client.account.address,
      to: recipient,
      value: amount,
      gasSponsorship: useSponsor,
      status: 'pending',
      timestamp: Date.now()
    })

    // Use sendUserOperation for better control over the process
    // This gives us the user operation hash that we can track
    const uo = await client.sendUserOperation({
      uo: {
        target: recipient,
        data: "0x" as Hex,
        value: parseEther(amount)
      },
      account: client.account
    })

    knownTxHash = uo.hash
    console.log('[Transaction] User operation sent:', uo.hash)

    // Update transaction log with UO hash
    await TransactionLogger.updateTransaction(uo.hash, {
      status: 'pending'
    })

    // Wait for the user operation to be included in a transaction
    // Use a longer timeout for testnets which can be slow
    try {
      const txHash = await client.waitForUserOperationTransaction({
        hash: uo.hash
      })

      console.log('[Transaction] Transaction hash:', txHash)

      // Update transaction log with success (block number will be determined later when viewing history)
      await TransactionLogger.updateTransaction(uo.hash, {
        status: 'success'
      })

      return txHash
    } catch (waitError) {
      console.warn('[Transaction] Timeout waiting for transaction, but user operation was submitted')
      console.warn('[Transaction] User operation hash:', uo.hash)

      // Keep status as pending, user can check later
      throw new Error(
        `Transaction submitted successfully but confirmation is taking longer than expected. ` +
        `User Operation Hash: ${uo.hash}. ` +
        `Check your transaction history in a few minutes.`
      )
    }
  } catch (error) {
    console.error('[Transaction] Error sending ETH:', error)
    console.error('[Transaction] Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause,
      stack: error.stack
    })

    // Update transaction log with failure if we have a hash
    if (knownTxHash) {
      await TransactionLogger.updateTransaction(knownTxHash, {
        status: 'failed',
        errorMessage: error.message
      })
    }

    throw new Error(`Failed to send ETH: ${error.message}`)
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
 * Trace internal transactions for a given transaction hash
 */
async function traceInternalTransactions(
  txHash: string,
  accountAddress: string,
  chain: any,
  rpcClient?: any
): Promise<Transaction[]> {
  const internalTxns: Transaction[] = []

  try {
    // Use debug_traceTransaction if available (Geth nodes), else alchemy_traceTransaction
    let traceData: any = null

    if (rpcClient) {
      // Try Geth debug_traceTransaction
      try {
        traceData = await rpcClient.request({
          method: 'debug_traceTransaction',
          params: [txHash, { tracer: 'callTracer' }],
          id: Date.now()
        })
      } catch {
        // Fallback to Alchemy if available
        console.log('[Internal Tx] debug_traceTransaction not available, trying Alchemy')
      }
    }

    // If we have trace data, parse internal calls
    if (traceData?.calls) {
      const parseCalls = (calls: any[], parentTx: Transaction) => {
        for (const call of calls) {
          // Look for CALL/DELEGATECALL/CREATE operations that transfer value
          if ((call.type === 'CALL' || call.type === 'DELEGATECALL') && call.value && BigInt(call.value) > 0) {
            // Check if call involves our account
            const callFrom = call.from?.toLowerCase()
            const callTo = call.to?.toLowerCase()
            const accountLower = accountAddress.toLowerCase()

            if (callFrom === accountLower || callTo === accountLower) {
              const internalTxn: Transaction = {
                hash: `${txHash}_internal_${call.from}_${call.to}_${call.value}`,
                from: call.from as `0x${string}`,
                to: call.to as `0x${string}`,
                value: BigInt(call.value).toString(),
                gasUsed: call.gasUsed ? parseInt(call.gasUsed, 16).toString() : undefined,
                gasPrice: parentTx.gasPrice,
                blockNumber: parentTx.blockNumber,
                timestamp: parentTx.timestamp,
                status: call.success !== false ? 'success' : 'failed', // Assume success if not explicitly failed
                chainId: parentTx.chainId,
                type: callFrom === accountLower ? 'send' : 'receive'
              }
              internalTxns.push(internalTxn)
            }
          }

          // Recursively check sub-calls
          if (call.calls) {
            parseCalls(call.calls, parentTx)
          }
        }
      }

      // Create parent tx object for tracing
      const parentTx: Transaction = {
        hash: txHash,
        from: '' as any,
        to: '' as any,
        value: '0',
        blockNumber: 0,
        timestamp: 0,
        status: 'success',
        chainId: chain.id,
        type: 'send'
      }

      parseCalls(traceData.calls, parentTx)
    }
  } catch (error) {
    console.log('[Internal Tx] Error tracing transaction:', txHash, error)
  }

  return internalTxns
}

/**
 * Get normal transactions (top-level)
 */
async function fetchNormalTransactions(
  accountId: string,
  accountAddress: string,
  chain: any,
  pageSize: number
): Promise<Transaction[]> {
  // This contains the existing logic for fetching normal transactions
  // (Alchemy API calls, block scanning, etc.)
  // Will be extracted from getTransactionHistory later
  return [] // Placeholder
}

/**
 * Get internal transactions by tracing recent sent transactions
 */
async function fetchInternalTransactions(
  accountId: string,
  accountAddress: string,
  chain: any,
  rpcClient?: any
): Promise<Transaction[]> {
  const internalTxns: Transaction[] = []

  try {
    // Get recent sent transactions to trace
    const { TransactionLogger } = await import("~/services/transactionLogger")
    const recentSentTxs = await TransactionLogger.getAccountTransactions(accountId, 100)
    const sentTxs = recentSentTxs
      .filter(tx => tx.type === 'send' && tx.chainId === chain.id)
      .slice(0, INTERNAL_TRACE_LIMIT) // Limit to prevent too many traces

    console.log(`[Internal Tx] Tracing ${sentTxs.length} recent sent transactions for internal calls`)

    for (const tx of sentTxs) {
      const traced = await traceInternalTransactions(tx.hash, accountAddress, chain, rpcClient)
      internalTxns.push(...traced)
    }

    console.log(`[Internal Tx] Found ${internalTxns.length} internal transactions`)
  } catch (error) {
    console.error('[Internal Tx] Error fetching internal transactions:', error)
  }

  return internalTxns
}

/**
 * Sync transaction data with local database
 */
async function syncTransactionsWithDB(transactions: Transaction[], accountId: string) {
  const { TransactionLogger } = await import("~/services/transactionLogger")

  console.log('[Transaction History] Syncing', transactions.length, 'transactions to local DB')

  for (const tx of transactions) {
    try {
      // Check if transaction already exists
      const existing = await TransactionLogger.getTransaction(tx.hash)

      if (existing) {
        // Update existing transaction with latest data from blockchain
        // Preserve any local metadata if it exists (like gasSponsorship)
        await TransactionLogger.updateTransaction(tx.hash, {
          status: tx.status,
          blockNumber: tx.blockNumber,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          timestamp: Math.floor(tx.timestamp), // Convert to milliseconds for storage
          chainId: tx.chainId,
          type: tx.type,
        })
        console.log('[Transaction History] Updated existing transaction:', tx.hash)
      } else {
        // Add new transaction to database
        await TransactionLogger.logTransaction(transactionToLog(tx, accountId))
        console.log('[Transaction History] Added new transaction to DB:', tx.hash)
      }
    } catch (error) {
      console.error('[Transaction History] Error syncing transaction:', tx.hash, error)
    }
  }
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

    // Run parallel queries
    const startTime = Date.now()
    const [normalTxns, internalTxns] = await Promise.allSettled([
      fetchNormalTransactions(accountId, accountAddress, chain, pageSize, rpcUrl, rpcClient, customNetwork),
      fetchInternalTransactions(accountId, accountAddress, chain, rpcClient)
    ])

    const allTransactions: Transaction[] = []

    // Process normal transaction results
    if (normalTxns.status === 'fulfilled') {
      allTransactions.push(...normalTxns.value)
    } else {
      console.error('[Transaction History] Normal transaction fetch failed:', normalTxns.reason)
    }

    // Process internal transaction results
    if (internalTxns.status === 'fulfilled') {
      allTransactions.push(...internalTxns.value)
    } else {
      console.error('[Transaction History] Internal transaction fetch failed:', internalTxns.reason)
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
    const normalTxns = await fetchNormalTransactions(accountId, accountAddress, chain, Math.min(pageSize, 10), rpcUrl, rpcClient, customNetwork, true)
    const internalTxns = await fetchInternalTransactions(accountId, accountAddress, chain, rpcClient)

    const allBackgroundTxns = [...normalTxns, ...internalTxns]

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

/**
 * Fetch normal transactions (existing logic extracted)
 */
async function fetchNormalTransactions(
  accountId: string,
  accountAddress: string,
  chain: any,
  pageSize: number,
  rpcUrl: string,
  rpcClient?: any,
  customNetwork?: any,
  isBackground = false
): Promise<Transaction[]> {
  try {

    console.log('[Transaction History] Fetching for account:', accountAddress)
    console.log('[Transaction History] Chain:', chain.name, chain.id)

    // Check if this is a custom network - if so, use direct RPC instead of Alchemy
    const { getCustomNetworkByChainId } = await import("~/utils/storage")
    const customNetwork = await getCustomNetworkByChainId(chain.id)

    let rpcUrl: string
    if (customNetwork) {
      // Use custom network RPC directly
      rpcUrl = customNetwork.rpcUrl
      console.log('[Transaction History] Using custom network RPC:', rpcUrl)
    } else {
      // Get the correct Alchemy network name for predefined networks
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
      console.log('[Transaction History] Using Alchemy URL:', rpcUrl)
    }

    // For custom networks, we need to use a different approach since Alchemy methods aren't available
    let transactions: Transaction[] = []

    if (customNetwork) {
      // Use viem-powered concurrent block scanning inspired by the online example
      // Process blocks in chunks for better performance
      try {
        // Get the current block number
        const blockResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
          })
        })

        const blockData = await blockResponse.json()
        if (!blockData.result) {
          throw new Error('Could not get block number')
        }

        const currentBlock = parseInt(blockData.result, 16)

        // Create RPC client for transaction queries (not Alchemy AA client)
        const rpcClient = createPublicClient({
          transport: http(customNetwork.rpcUrl)
        })

        // Account Activation Detection: Find when account first became active
        const activationBlock = await findAccountActivationBlock(accountAddress, currentBlock, rpcClient)

        // Smart scanning: From activation block to current (with minimum range)
        // const minimumHistoryDays = 7 // At least 7 days of history
        // const estimatedDailyBlocks = 7200 // Rough estimate: 7200 blocks per day on busy networks
        const minimumHistoryDays = 14 // or 30–90 depending on UX
        const estimatedDailyBlocks = 43200 // ~2s blocks
        const minimumBlocks = minimumHistoryDays * estimatedDailyBlocks

        const blocksToScan = Math.max(minimumBlocks, currentBlock - activationBlock)
        const startBlock = Math.max(0, currentBlock - blocksToScan)

        console.log(`[Transaction History] Account activation at block ${activationBlock}, scanning ${blocksToScan} blocks from ${startBlock} to ${currentBlock}`)

        // Process blocks in concurrent chunks with production-grade rate limiting
        const CONCURRENT_BLOCKS = MAX_CONCURRENT_BLOCKS // Optimized for speed
        const THROTTLE_DELAY = THROTTLE_DELAY_MS // Optimized for speed
        const LOG_CHUNK_SIZE = LOG_CHUNK_SIZE_BLOCKS // Optimized for speed

        // Include currentBlock in scan range (endBlock inclusive)
        const endBlock = currentBlock
        const blocksToScanInclusive = Math.max(minimumBlocks, endBlock - activationBlock)
        const startBlockInclusive = Math.max(0, endBlock - blocksToScanInclusive)
        const total = endBlock - startBlockInclusive + 1

        // === PRIORITY: Scan EntryPoint FIRST (fast, high-value for AA wallets) ===
        const MAX_DAYS_FOR_AA_WALLET = 90 // ~90 days for practical AA scanning (not 3+ years)
        const aaScanStart = Math.max(startBlockInclusive, currentBlock - (MAX_DAYS_FOR_AA_WALLET * 43200))
        const EP = ENTRY_POINT_BY_CHAIN[chain.id]

        if (EP) {
          console.log('[Transaction History] 🔍 PRIORITY: Scanning EntryPoint UserOperationEvent (90 days max)')
          for (let s = aaScanStart; s <= endBlock && transactions.length < pageSize; s += LOG_CHUNK_SIZE) {
            const e = Math.min(s + LOG_CHUNK_SIZE - 1, endBlock)

            try {
              const userOpLogs = await rpcClient.request({
                method: 'eth_getLogs',
                params: [{
                  fromBlock: `0x${s.toString(16)}`,
                  toBlock: `0x${e.toString(16)}`,
                  address: EP,
                  topics: [
                    USER_OPERATION_EVENT_TOPIC_V06,
                    null,
                    padAddressForTopic(accountAddress)
                  ],
                }],
                id: s + 500000,
              }) as any[]

              for (const log of userOpLogs) {
                // Fetch parent tx, block, receipt
                const [tx, block, receipt] = await Promise.all([
                  rpcClient.request({ method: 'eth_getTransactionByHash', params: [log.transactionHash], id: log.transactionHash }),
                  rpcClient.request({ method: 'eth_getBlockByNumber', params: [log.blockNumber, false], id: log.blockNumber }),
                  rpcClient.request({ method: 'eth_getTransactionReceipt', params: [log.transactionHash], id: log.transactionHash + 'r' }),
                ])
                if (!tx || !block) continue

                // Decode for gas stats (optional but nice)
                let actualGasCost: string | undefined
                let success: boolean | undefined
                try {
                  const decoded = decodeEventLog({
                    abi: entryPointV06Abi as any,
                    data: log.data as `0x${string}`,
                    topics: [USER_OPERATION_EVENT_TOPIC_V06],
                  }) as any
                  if (decoded?.eventName === 'UserOperationEvent') {
                    const args = decoded.args
                    if (args?.actualGasCost != null) actualGasCost = BigInt(args.actualGasCost).toString()
                    if (args?.success != null) success = !!args.success
                  }
                } catch {}

                const t: Transaction = {
                  hash: log.transactionHash,
                  from: accountAddress as `0x${string}`,
                  to: EP,
                  value: '0',
                  gasUsed: receipt ? parseInt((receipt as any).gasUsed, 16).toString() : undefined,
                  gasPrice: (tx as any).gasPrice ? BigInt((tx as any).gasPrice).toString() : undefined,
                  blockNumber: parseInt(log.blockNumber, 16),
                  timestamp: parseInt((block as any).timestamp, 16),
                  status: success != null ? (success ? 'success' : 'failed') : ((receipt && (receipt as any).status === '0x1') ? 'success' : 'failed'),
                  chainId: chain.id,
                  type: 'send',
                }

                if (!transactions.some(x => x.hash === t.hash)) {
                  transactions.push(t)
                  console.log(`[Transaction History] ✅ AA UserOperation tx added: ${t.hash}`)
                }

                if (transactions.length >= pageSize) break
              }

              if (transactions.length >= pageSize) break
              await new Promise(r => setTimeout(r, THROTTLE_DELAY / 3)) // Faster EntryPoint scanning
            } catch (err) {
              console.log(`[Transaction History] EP scan failed for range ${s}-${e}:`, err)
            }
          }
        }

        // === SECONDARY: Scan ERC-20 transfers (more expensive, falls back gracefully)
        const MAX_DAYS_FOR_ERC20 = 30 // Conservative 30-day limit for ERC-20 (vs unlimited)
        const erc20ScanStart = Math.max(startBlockInclusive, currentBlock - (MAX_DAYS_FOR_ERC20 * 43200))
        console.log('[Transaction History] 📊 Scanning ERC-20 Transfer logs (30 days, secondary)')

        // Process logs in the same block range using chunked eth_getLogs (smaller chunks for better throttling)

        for (let logChunkStart = startBlockInclusive; logChunkStart <= endBlock && transactions.length < pageSize; logChunkStart += LOG_CHUNK_SIZE) {
          const logChunkEnd = Math.min(logChunkStart + LOG_CHUNK_SIZE - 1, endBlock)

          try {
            // Query for ERC-20 Transfer events SEQUENTIALLY (not parallel) to avoid rate limits
            // First: Transfers FROM wallet (outbound)
            const logsFrom = await rpcClient.request({
              method: 'eth_getLogs',
              params: [{
                fromBlock: `0x${logChunkStart.toString(16)}`,
                toBlock: `0x${logChunkEnd.toString(16)}`,
                topics: [TRANSFER_TOPIC_ERC20, padAddressForTopic(accountAddress), null],
              }],
              id: logChunkStart + 100000 // offset to avoid id conflicts
            })

            // Throttle between the two queries
            await new Promise(resolve => setTimeout(resolve, 200))

            // Second: Transfers TO wallet (inbound)
            const logsTo = await rpcClient.request({
              method: 'eth_getLogs',
              params: [{
                fromBlock: `0x${logChunkStart.toString(16)}`,
                toBlock: `0x${logChunkEnd.toString(16)}`,
                topics: [TRANSFER_TOPIC_ERC20, null, padAddressForTopic(accountAddress)],
              }],
              id: logChunkStart + 200000
            })

            const logsFromArray = (logsFrom as any[]) || []
            const logsToArray = (logsTo as any[]) || []
            const allTransferLogs = [...logsFromArray, ...logsToArray]

            // Convert each log to transaction format
            for (const log of allTransferLogs) {
              if (transactions.length >= pageSize) break

              // Get parent transaction and block info
              const [tx, block] = await Promise.all([
                rpcClient.request({
                  method: 'eth_getTransactionByHash',
                  params: [log.transactionHash],
                  id: log.transactionHash
                }),
                rpcClient.request({
                  method: 'eth_getBlockByNumber',
                  params: [log.blockNumber, false],
                  id: log.blockNumber
                })
              ])

              if (!tx || !block) continue

              // Parse ERC-20 Transfer topics (from, to, value)
              const from = `0x${(log.topics[1] as string)?.slice(26)}` as `0x${string}`
              const to = `0x${(log.topics[2] as string)?.slice(26)}` as `0x${string}`
              const value = BigInt((log.data as string) || '0').toString()

              const transaction: Transaction = {
                hash: log.transactionHash,
                from,
                to,
                value, // Token transfer value (not ETH)
                gasUsed: undefined,
                gasPrice: (tx as any).gasPrice ? BigInt((tx as any).gasPrice).toString() : undefined,
                blockNumber: parseInt(log.blockNumber, 16),
                timestamp: parseInt((block as any).timestamp, 16),
                status: 'success', // Logs imply successful execution
                chainId: chain.id,
                type: from?.toLowerCase() === accountAddress.toLowerCase() ? 'send' : 'receive'
              }

              transactions.push(transaction)

              // Note in logs about ERC-20 transfer detection
              console.log(`[Transaction History] ⚡ Found ERC-20 transfer via logs: ${transaction.type} ${value} tokens in ${log.transactionHash}`)
            }

            // Throttle log queries too
            await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY))
          } catch (logError) {
            console.log(`[Transaction History] Failed to fetch logs for range ${logChunkStart}-${logChunkEnd}:`, logError)
          }
        }

        // EntryPoint scanning moved to PRIORITY section above

        // === OPTIONAL: AccountDeployed events ===
        if (EP) {
          for (let s = startBlockInclusive; s <= endBlock && transactions.length < pageSize; s += LOG_CHUNK_SIZE) {
            const e = Math.min(s + LOG_CHUNK_SIZE - 1, endBlock)
            try {
              const depLogs = await rpcClient.request({
                method: 'eth_getLogs',
                params: [{
                  fromBlock: `0x${s.toString(16)}`,
                  toBlock: `0x${e.toString(16)}`,
                  address: EP,
                  topics: [ACCOUNT_DEPLOYED_TOPIC, padAddressForTopic(accountAddress)],
                }],
                id: s + 510000,
              }) as any[]

              for (const log of depLogs) {
                if (transactions.some(x => x.hash === log.transactionHash)) continue
                const [tx, block, receipt] = await Promise.all([
                  rpcClient.request({ method: 'eth_getTransactionByHash', params: [log.transactionHash], id: log.transactionHash }),
                  rpcClient.request({ method: 'eth_getBlockByNumber', params: [log.blockNumber, false], id: log.blockNumber }),
                  rpcClient.request({ method: 'eth_getTransactionReceipt', params: [log.transactionHash], id: log.transactionHash + 'r' }),
                ])
                const t: Transaction = {
                  hash: log.transactionHash,
                  from: accountAddress as `0x${string}`,
                  to: EP,
                  value: '0',
                  gasUsed: receipt ? parseInt((receipt as any).gasUsed, 16).toString() : undefined,
                  gasPrice: (tx as any).gasPrice ? BigInt((tx as any).gasPrice).toString() : undefined,
                  blockNumber: parseInt(log.blockNumber, 16),
                  timestamp: parseInt((block as any).timestamp, 16),
                  status: receipt && (receipt as any).status === '0x1' ? 'success' : 'failed',
                  chainId: chain.id,
                  type: 'send',
                }
                transactions.push(t)
                console.log(`[Transaction History] 🧩 AccountDeployed (AA deploy) tx added: ${t.hash}`)
                if (transactions.length >= pageSize) break
              }

              await new Promise(r => setTimeout(r, THROTTLE_DELAY))
            } catch {}
          }
        }



        // BLOCK SCANNING: Now scan for top-level transactions (existing logic)
        console.log('[Transaction History] Starting block scanning for top-level transactions')

        const totalChunks = Math.ceil(total / CONCURRENT_BLOCKS)

        for (let chunkNum = totalChunks - 1; chunkNum >= 0 && transactions.length < pageSize; chunkNum--) {
          // Calculate block range for this chunk (newest to oldest within chunk)
          const chunkStart = Math.max(0, chunkNum * CONCURRENT_BLOCKS)
          const chunkEnd = Math.min(chunkStart + CONCURRENT_BLOCKS, total)
          const chunkBlocks = []

          // Add blocks in this chunk in reverse order (newest first)
          for (let i = chunkEnd - 1; i >= chunkStart; i--) {
            const blockNumber = startBlockInclusive + i
            chunkBlocks.push({
              blockNumber,
              request: rpcClient.request({
                method: "eth_getBlockByNumber",
                params: [`0x${blockNumber.toString(16)}`, true], // true = include full txs
                id: blockNumber
              })
            })
          }

          // Execute all block requests concurrently
          const blockResults = await Promise.allSettled(chunkBlocks.map(cb => cb.request))

          // Process results from this chunk
          for (let idx = 0; idx < blockResults.length && transactions.length < pageSize; idx++) {
            const result = blockResults[idx]
            const blockInfo = chunkBlocks[idx]

            if (result.status === 'fulfilled') {
              const block = result.value

              if (block?.transactions && block.transactions.length > 0) {
                // Filter transactions to only those involving our account (like the online example)
                for (const tx of block.transactions) {
                  if (
                    tx.from?.toLowerCase() === accountAddress.toLowerCase() ||
                    tx.to?.toLowerCase() === accountAddress.toLowerCase()
                  ) {
                    let status: 'success' | 'failed' | 'pending' = 'pending'
                    let gasUsed: string | undefined

                    // Get transaction receipt for status
                    try {
                      const receipt = await rpcClient.request({
                        method: "eth_getTransactionReceipt",
                        params: [tx.hash],
                        id: 1
                      }) as any // Transaction receipt response

                      if (receipt) {
                        status = receipt.status === '0x1' ? 'success' : 'failed'
                        gasUsed = parseInt(receipt.gasUsed, 16).toString()
                      }
                    } catch (receiptError) {
                      // Keep default pending status
                    }

                    const transaction: Transaction = {
                      hash: tx.hash,
                      from: tx.from as `0x${string}`,
                      to: (tx.to || "0x0000000000000000000000000000000000000000") as `0x${string}`,
                      value: tx.value ? BigInt(tx.value).toString() : "0",
                      gasUsed,
                      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice).toString() : undefined,
                      blockNumber: blockInfo.blockNumber,
                      timestamp: block.timestamp ? parseInt(block.timestamp, 16) : Date.now() / 1000,
                      status,
                      chainId: chain.id,
                      type: tx.from?.toLowerCase() === accountAddress.toLowerCase() ? 'send' : 'receive'
                    }

                    transactions.push(transaction)

                    // Stop if we hit the page size limit
                    if (transactions.length >= pageSize) break
                  }
                }
              }
            } else {
              console.log(`Failed to fetch block ${blockInfo.blockNumber}:`, result.reason)
            }

            // Early exit if we've collected enough transactions
            if (transactions.length >= pageSize) break
          }

          // Early exit if we've collected enough transactions
          if (transactions.length >= pageSize) break

          // Add throttling delay between chunks to prevent rate limiting
          if (chunkNum > 0 && transactions.length < pageSize) {
            await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY))
          }
        }

        console.log(`[Transaction History] Found ${transactions.length} transactions on custom network`)

        // Sync with local database
        await syncTransactionsWithDB(transactions, accountId)

      } catch(rpcError) {
        console.error('[Transaction History] Error fetching from custom RPC:', rpcError)
        // Return empty transactions for custom network if RPC fails
        transactions = []
      }
    } else {
      // For predefined networks, use Alchemy API
      const [sentResponse, receivedResponse] = await Promise.all([
        // Sent transactions (from this account)
        fetch(rpcUrl,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "alchemy_getAssetTransfers",
              params: [
                {
                  fromBlock: "0x0",
                  toBlock: "latest",
                  fromAddress: accountAddress,
                  category: ["external", "erc20"],
                  maxCount: `0x${pageSize.toString(16)}`,
                  excludeZeroValue: false,
                  withMetadata: true
                }
              ],
              id: 1,
            }),
          }
        ),
        // Received transactions (to this account)
        fetch(rpcUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "alchemy_getAssetTransfers",
              params: [
                {
                  fromBlock: "0x0",
                  toBlock: "latest",
                  toAddress: accountAddress,
                  category: ["external", "erc20"],  // internal only applies to Ethereum Mainnet and Polygon Mainnet
                  maxCount: `0x${pageSize.toString(16)}`,
                  excludeZeroValue: false,
                  withMetadata: true
                }
              ],
              id: 2,
            }),
          }
        )
      ])

      const [sentData, receivedData] = await Promise.all([
        sentResponse.json(),
        receivedResponse.json()
      ])

      console.log('[Transaction History] Sent response:', sentData)
      console.log('[Transaction History] Received response:', receivedData)

      if (sentData.error) {
        console.error("RPC API error (sent):", sentData.error)
      }

      if (receivedData.error) {
        console.error("RPC API error (received):", receivedData.error)
      }

      if (sentData.error && receivedData.error) {
        console.error("Both API calls failed")
        return []
      }

      const sentTransfers = (sentData.result?.transfers || []).filter(t => t && t.hash)
      const receivedTransfers = (receivedData.result?.transfers || []).filter(t => t && t.hash)

      // Combine all transfers
      const allTransfers = [...sentTransfers, ...receivedTransfers]

      console.log('[Transaction History] Found transfers:', {
        sent: sentTransfers.length,
        received: receivedTransfers.length,
        total: allTransfers.length
      })

      for (const transfer of allTransfers) {
        let txType: 'send' | 'receive' = 'receive'
        if (transfer.from.toLowerCase() === accountAddress.toLowerCase()) {
          txType = 'send'
        }

        // Get transaction details for gas info and status
        let txDetails = null
        let gasUsed = null
        let gasPrice = null
        let status: 'success' | 'failed' | 'pending' = 'pending'

        try {
          const txResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getTransactionReceipt",
              params: [transfer.hash],
              id: 1,
            }),
          })

          const txData = await txResponse.json()
          if (txData.result) {
            txDetails = txData.result
            gasUsed = txDetails.gasUsed
            gasPrice = txDetails.effectiveGasPrice
            status = txDetails.status === '0x1' ? 'success' : 'failed'
          }
        } catch (txError) {
          console.log("Could not get transaction details:", txError)
        }

        const transaction: Transaction = {
          hash: transfer.hash,
          from: transfer.from as `0x${string}`,
          to: (transfer.to || "0x0000000000000000000000000000000000000000") as `0x${string}`, // Handle contract creation (to is null)
          value: (transfer.value || "0").toString(),
          gasUsed: gasUsed ? parseInt(gasUsed, 16).toString() : undefined,
          gasPrice: gasPrice ? parseInt(gasPrice, 16).toString() : undefined,
          blockNumber: parseInt(transfer.blockNum, 16),
          timestamp: transfer.metadata?.blockTimestamp ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000 : Date.now() / 1000,
          status,
          chainId: chain.id,
          type: txType
        }

        transactions.push(transaction)
      }

      // Remove duplicates (same hash)
      const uniqueTransactions = transactions.filter((tx, index, self) =>
        index === self.findIndex((t) => t.hash === tx.hash)
      )

      console.log('[Transaction History] Processed transactions:', uniqueTransactions.length)

      return uniqueTransactions
    }

    return transactions
  } catch (error) {
    console.error("Error fetching transaction history:", error)
    // Return what we have (empty on error)
    return transactions
  }
}
