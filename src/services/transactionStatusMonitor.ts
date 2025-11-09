import { createPublicClient, http } from "viem"
import { TransactionLogger } from "./transactionLogger"
import { TransactionPromiseManager } from "./transactionPromiseManager"
import { getCurrentChain } from "./transaction"

class TransactionStatusMonitor {
  private static instance: TransactionStatusMonitor
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly POLL_INTERVAL = 12000 // 12 seconds
  private readonly MAX_ATTEMPTS = 20 // ~4 minutes total
  private statusCheckCounts = new Map<string, number>() // Track check attempts per tx
  private priorityTransactions = new Map<string, string>() // txId -> hash mapping for priority monitoring

  static getInstance(): TransactionStatusMonitor {
    if (!TransactionStatusMonitor.instance) {
      TransactionStatusMonitor.instance = new TransactionStatusMonitor()
    }
    return TransactionStatusMonitor.instance
  }

  startMonitoring() {
    if (this.monitoringInterval) return // Already running

    this.monitoringInterval = setInterval(async () => {
      await this.checkPendingTransactions()
    }, this.POLL_INTERVAL)

    console.log('[TransactionStatusMonitor] Started background monitoring')
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    console.log('[TransactionStatusMonitor] Stopped background monitoring')
  }

  // Add specific transaction for priority monitoring
  monitorSpecificTransaction(transactionId: string, hash: string) {
    console.log(`[TransactionStatusMonitor] Adding priority monitoring for ${transactionId}`)
    this.priorityTransactions.set(transactionId, hash)
    this.statusCheckCounts.set(hash, 0)
  }

  private async checkPendingTransactions() {
    try {
      // First check priority transactions (recently submitted)
      for (const [txId, hash] of this.priorityTransactions) {
        await this.updateTransactionStatusByHash(hash)
      }

      // Then check all pending transactions from the database
      const pendingTxs = await TransactionLogger.getPendingTransactions()

      for (const tx of pendingTxs) {
        // Skip if already checked recently in priority monitoring
        if (this.priorityTransactions.has(tx.hash)) continue

        await this.updateTransactionStatus(tx)
      }
    } catch (error) {
      console.error('[TransactionStatusMonitor] Error checking pending transactions:', error)
    }
  }

  private async updateTransactionStatus(tx: any) {
    await this.updateTransactionStatusByHash(tx.hash)
  }

  private async updateTransactionStatusByHash(txHash: string) {
    try {
      const attemptCount = this.statusCheckCounts.get(txHash) || 0

      // Don't check forever - give up after MAX_ATTEMPTS
      if (attemptCount >= this.MAX_ATTEMPTS) {
        console.log(`[TransactionStatusMonitor] Giving up on ${txHash} after ${this.MAX_ATTEMPTS} attempts`)
        this.statusCheckCounts.delete(txHash)

        // Remove from priority monitoring if present
        for (const [txId, hash] of this.priorityTransactions) {
          if (hash === txHash) {
            this.priorityTransactions.delete(txId)
            break
          }
        }

        // Mark as failed due to timeout
        await TransactionLogger.updateTransaction(txHash, {
          status: 'failed',
          errorMessage: 'Transaction confirmation timeout'
        })

        // Resolve promise as failed
        const promiseManager = TransactionPromiseManager.getInstance()
        promiseManager.resolveTransactionPromise(txHash, false, 'Transaction confirmation timeout')

        return
      }

      this.statusCheckCounts.set(txHash, attemptCount + 1)

      const chain = await getCurrentChain()
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0])
      })

      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })

      if (receipt) {
        const status = receipt.status === 'success' ? 'success' : 'failed'

        console.log(`[TransactionStatusMonitor] ✅ ${txHash} confirmed: ${status}`)

        // Update database with complete blockchain data
        const enrichmentData: any = {
          status,
          blockNumber: parseInt(receipt.blockNumber.toString()),
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: receipt.gasPrice.toString(),
        }

        await TransactionLogger.updateTransaction(txHash, enrichmentData)

        // Resolve the promise
        const promiseManager = TransactionPromiseManager.getInstance()
        promiseManager.resolveTransactionPromise(txHash, status === 'success')

        // Remove from priority monitoring
        for (const [txId, hash] of this.priorityTransactions) {
          if (hash === txHash) {
            this.priorityTransactions.delete(txId)
            break
          }
        }

        // Clean up attempt counter
        this.statusCheckCounts.delete(txHash)
      } else {
        console.log(`[TransactionStatusMonitor] ${txHash} still pending (attempt ${attemptCount + 1}/${this.MAX_ATTEMPTS})`)
      }
    } catch (error) {
      console.log(`[TransactionStatusMonitor] Still pending or error for ${txHash}: ${error}`)
      // Transaction might not be mined yet, that's ok - we'll check again later
    }
  }
}

// Export singleton instance functions for convenience
export { TransactionStatusMonitor }
