import {parseEther, formatEther, type Address, type Hex} from "viem"
import type {
  Transaction,
  TransactionHistory,
  GasEstimate,
  SponsorshipCheck
} from "~/types/account"
import { getAccountClient } from "~/services/wallet"
import { TransactionLogger } from "~/services/transactionLogger"
import type { TransactionLog } from "~/services/transactionLogger"

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
      hash: uo.hash,
      status: 'pending'
    })

    // Wait for the user operation to be included in a transaction
    // Use a longer timeout for testnets which can be slow
    try {
      const txReceipt = await client.waitForUserOperationTransaction({
        hash: uo.hash
      })

      console.log('[Transaction] Transaction receipt:', txReceipt)

      // Update transaction log with success
      await TransactionLogger.updateTransaction(uo.hash, {
        status: 'success',
        blockNumber: txReceipt.blockNumber
      })

      return txReceipt
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
 * Get transaction history for an account from Alchemy and sync with local DB
 */
export async function getTransactionHistory(
  accountId: string,
  pageSize = 50
): Promise<TransactionHistory> {
  try {
    const client = await getAccountClient(accountId, await getCurrentChain())
    const accountAddress = client.account.address
    const chain = await getCurrentChain()

    console.log('[Transaction History] Fetching for account:', accountAddress)
    console.log('[Transaction History] Chain:', chain.name, chain.id)

    // Get the correct Alchemy network name
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
    const alchemyUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY}`

    console.log('[Transaction History] Using Alchemy URL:', alchemyUrl)

    // Fetch both sent and received transactions
    const [sentResponse, receivedResponse] = await Promise.all([
      // Sent transactions (from this account)
      fetch(alchemyUrl,
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
      fetch(alchemyUrl,
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
      console.error("Alchemy API error (sent):", sentData.error)
    }

    if (receivedData.error) {
      console.error("Alchemy API error (received):", receivedData.error)
    }

    if (sentData.error && receivedData.error) {
      console.error("Both API calls failed")
      // Fall back to local database if Alchemy fails
      const { TransactionLogger } = await import("~/services/transactionLogger")
      const localTxs = await TransactionLogger.getAccountTransactions(accountId, pageSize)
      // Filter transactions to only include those for the current chain
      const chainFilteredTxs = localTxs.filter(tx => tx.chainId === chain.id)
      const transactions = chainFilteredTxs.map(logToTransaction)
      return {
        transactions: transactions,
        totalCount: transactions.length
      }
    }

    const transactions: Transaction[] = []
    const sentTransfers = (sentData.result?.transfers || []).filter(t => t && t.hash)
    const receivedTransfers = (receivedData.result?.transfers || []).filter(t => t && t.hash)

    // Combine all transfers
    const allTransfers = [...sentTransfers, ...receivedTransfers]

    console.log('[Transaction History] Found transfers:', {
      sent: sentTransfers.length,
      received: receivedTransfers.length,
      total: allTransfers.length
    })

    if (allTransfers.length === 0) {
      console.log('[Transaction History] No transfers found')
      // Continue with sync even if no new transfers (will sync local data)
    } else {
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
          const txResponse = await fetch(alchemyUrl, {
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
    }

    // Remove duplicates (same hash)
    const uniqueTransactions = transactions.filter((tx, index, self) =>
      index === self.findIndex((t) => t.hash === tx.hash)
    )

    console.log('[Transaction History] Processed transactions:', uniqueTransactions.length)

    // Sync with local database
    await syncTransactionsWithDB(uniqueTransactions, accountId)

    // Now return the complete history from the local database, filtered by current chain
    const { TransactionLogger } = await import("~/services/transactionLogger")
    const allLocalTxs = await TransactionLogger.getAccountTransactions(accountId)

    // Filter transactions to only include those for the current chain
    const chainFilteredTxs = allLocalTxs.filter(tx => tx.chainId === chain.id)

    // Convert to Transaction format and sort by newest first
    const allTransactions = chainFilteredTxs
      .map(logToTransaction)
      .sort((a, b) => b.timestamp - a.timestamp)

    console.log('[Transaction History] Returning', allTransactions.length, 'total transactions from synced DB')

    return {
      transactions: allTransactions,
      totalCount: allTransactions.length
    }
  } catch (error) {
    console.error("Error fetching transaction history:", error)
    // Fall back to local database if everything fails
    try {
      const { TransactionLogger } = await import("~/services/transactionLogger")
      const localTxs = await TransactionLogger.getAccountTransactions(accountId)
      // Filter transactions to only include those for the current chain
      const chainFilteredTxs = localTxs.filter(tx => tx.chainId === chain.id)
      const transactions = chainFilteredTxs.map(logToTransaction)
      return {
        transactions: transactions,
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
  const { getSelectedNetwork } = await import("~/utils/storage")
  const { getChainById, defaultChain } = await import("~/config/chains")

  const chainId = await getSelectedNetwork()
  return chainId ? getChainById(chainId) || defaultChain : defaultChain
}
