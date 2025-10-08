import {parseEther, formatEther, type Address, type Hex} from "viem"
import type {
  Transaction,
  TransactionHistory,
  GasEstimate,
  SponsorshipCheck
} from "~/types/account"
import { getAccountClient } from "~/services/wallet"

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

    console.log('[Transaction] User operation sent:', uo.hash)

    // Wait for the user operation to be included in a transaction
    // Use a longer timeout for testnets which can be slow
    try {
      const txReceipt = await client.waitForUserOperationTransaction({
        hash: uo.hash,
        timeout: 120_000, // 2 minutes timeout for testnets
        pollingInterval: 2_000 // Poll every 2 seconds
      })

      console.log('[Transaction] Transaction receipt:', txReceipt)

      return txReceipt
    } catch (waitError) {
      console.warn('[Transaction] Timeout waiting for transaction, but user operation was submitted')
      console.warn('[Transaction] User operation hash:', uo.hash)

      // Return the user operation hash so user can track it
      // The transaction will eventually be mined
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

    throw new Error(`Failed to send ETH: ${error.message}`)
  }
}

/**
 * Get transaction history for an account from Alchemy
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
      return { transactions: [], totalCount: 0 }
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
      return { transactions: [], totalCount: 0 }
    }

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
        to: transfer.to as `0x${string}`,
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

    // Sort by newest first
    uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp)

    console.log('[Transaction History] Processed transactions:', uniqueTransactions.length)

    return {
      transactions: uniqueTransactions,
      totalCount: uniqueTransactions.length
    }
  } catch (error) {
    console.error("Error fetching transaction history:", error)
    return {
      transactions: [],
      totalCount: 0
    }
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
