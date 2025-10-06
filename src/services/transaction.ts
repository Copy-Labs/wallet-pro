import { parseEther, formatEther, type Address } from "viem"
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
    const client = await getAccountClient(fromAccountId, await getCurrentChain())

    // Estimate gas for a simple ETH transfer
    const gasLimit = await client.estimateGas({
      to: recipient,
      value: parseEther(amount)
    })

    // Get current gas price
    const gasPrice = await client.getGasPrice()

    // Calculate estimated cost
    const estimatedCost = gasLimit * gasPrice
    const estimatedCostEth = formatEther(estimatedCost)

    // For MVP, use a simple ETH to USD conversion (in reality, you'd use price API)
    const ethPriceUSD = 3000 // Approximate ETH price, should be from API
    const estimatedCostUSD = (parseFloat(estimatedCostEth) * ethPriceUSD).toFixed(2)

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: formatEther(gasPrice),
      estimatedCost: estimatedCostEth,
      estimatedCostUSD
    }
  } catch (error) {
    console.error("Error estimating gas:", error)
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
    const client = await getAccountClient(fromAccountId, await getCurrentChain())

    // Send transaction
    const userOpResult = await client.sendTransaction({
      to: recipient,
      value: parseEther(amount),
      kzg: {
        blobToKzgCommitment: function (blob: Uint8Array): Uint8Array {
          throw new Error("Function not implemented.")
        },
        computeBlobKzgProof: function (blob: Uint8Array, commitment: Uint8Array): Uint8Array {
          throw new Error("Function not implemented.")
        }
      },
      account: "",
      chain: undefined
    })

    // Wait for the transaction to be mined
    const txHash = await client.waitForUserOperationTransaction(userOpResult)

    return txHash
  } catch (error) {
    console.error("Error sending ETH:", error)
    throw new Error(`Failed to send ETH: ${error.message}`)
  }
}

/**
 * Get transaction history for an account from Alchemy
 */
export async function getTransactionHistory(
  accountId: string,
  pageSize = 10
): Promise<TransactionHistory> {
  try {
    const client = await getAccountClient(accountId, await getCurrentChain())
    const accountAddress = client.account.address
    const chain = await getCurrentChain()

    // Use Alchemy's enhanced APIs for transaction history
    const alchemyClient = await import("@alchemy/aa-alchemy").then(
      (mod) => mod.createAlchemyPublicClient({ chain, apiKey: process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY })
    )

    const response = await fetch(
      `https://${chain.id === 1 ? 'eth-mainnet' : chain.id === 11155111 ? 'sepolia' : 'eth-mainnet'}.g.alchemy.com/v2/${process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY}`,
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
              fromAddress: accountAddress,
              toAddress: accountAddress,
              category: ["external", "internal", "erc20"],
              maxCount: `0x${pageSize.toString(16)}`,
              excludeZeroValue: false,
            }
          ],
          id: 1,
        }),
      }
    )

    const data = await response.json()

    if (data.error) {
      console.error("Alchemy API error:", data.error)
      return { transactions: [], totalCount: 0 }
    }

    const transactions: Transaction[] = []
    const transfers = data.result.transfers || []

    for (const transfer of transfers) {
      let txType: 'send' | 'receive' = 'receive'
      if (transfer.from === accountAddress.toLowerCase()) {
        txType = 'send'
      }

      // Get transaction details for gas info and status
      let txDetails = null
      let gasUsed = null
      let gasPrice = null
      let status: 'success' | 'failed' | 'pending' = 'pending'

      try {
        const txResponse = await fetch(
          `https://${chain.id === 1 ? 'eth-mainnet' : chain.id === 11155111 ? 'sepolia' : 'eth-mainnet'}.g.alchemy.com/v2/${process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY}`,
          {
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
          }
        )

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
        value: transfer.value || transfer.amount, // Handle different formats
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

    // Sort by newest first
    transactions.sort((a, b) => b.timestamp - a.timestamp)

    return {
      transactions,
      totalCount: transfers.length
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
