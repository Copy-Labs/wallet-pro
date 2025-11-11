import { createPublicClient, http, type TransactionReceipt } from "viem"
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
  private eip7702Transactions = new Map<string, string>() // tempId -> userOpId mapping

  static getInstance(): TransactionStatusMonitor {
    if (!TransactionStatusMonitor.instance) {
      TransactionStatusMonitor.instance = new TransactionStatusMonitor()
    }
    return TransactionStatusMonitor.instance
  }

  async startMonitoring() {
    if (this.monitoringInterval) return // Already running

    this.monitoringInterval = setInterval(async () => {
      await this.checkPendingTransactions()
    }, this.POLL_INTERVAL)

    console.log('[TransactionStatusMonitor] Started background monitoring')

    // Return resolved promise so background script can await and catch errors
    return Promise.resolve()
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

  // Special monitoring for EIP-7702 transactions (tempId -> userOpId mapping)
  monitorEip7702Transaction(tempId: string, userOpId: string) {
    console.log(`[TransactionStatusMonitor] Adding EIP-7702 monitoring: ${tempId} -> ${userOpId}`)
    this.eip7702Transactions.set(userOpId, tempId) // userOpId -> tempId mapping
    this.statusCheckCounts.set(userOpId, 0)
  }

  private async checkPendingTransactions() {
    try {
      // First check EIP-7702 transactions (need special handling)
      await this.checkEip7702Transactions()

      // Then check priority transactions (recently submitted)
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
    if (!tx?.hash) return
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
          gasPrice: (receipt as any).gasPrice?.toString() || (receipt as any).effectiveGasPrice?.toString(),
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

  // Special handler for EIP-7702 transactions
  private async checkEip7702Transactions() {
    const promiseManager = TransactionPromiseManager.getInstance()

    for (const [userOpId, tempId] of this.eip7702Transactions) {
      try {
        console.log('[TransactionStatusMonitor] Checking EIP-7702 UserOp', {
          userOpId,
          tempId
        })

        const chain = await getCurrentChain()
        const publicClient = createPublicClient({
          chain,
          transport: http(chain.rpcUrls.default.http[0])
        })

        const receipt = await publicClient.getTransactionReceipt({ hash: userOpId as `0x${string}` })

        if (receipt) {
          const status = receipt.status === 'success' ? 'success' : 'failed'

          console.log('[TransactionStatusMonitor] ✅ EIP-7702 UserOp confirmed', {
            userOpId,
            tempId,
            status
          })

          await TransactionLogger.updateTransaction(userOpId, {
            onChainTxHash: userOpId,
            status,
            blockNumber: parseInt(receipt.blockNumber.toString()),
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: (receipt as any).gasPrice?.toString() || (receipt as any).effectiveGasPrice?.toString(),
          })

          // Resolve the promise using the tempId tracked in the promise manager
          console.log('[TransactionStatusMonitor] Resolving EIP-7702 promise', {
            userOpId,
            tempId,
            success: status === 'success'
          })
          promiseManager.resolveTransactionPromise(tempId, status === 'success')

          // Clean up mappings
          this.eip7702Transactions.delete(userOpId)
          this.statusCheckCounts.delete(userOpId)
        } else {
          const attempts = (this.statusCheckCounts.get(userOpId) || 0) + 1
          this.statusCheckCounts.set(userOpId, attempts)
          console.log('[TransactionStatusMonitor] EIP-7702 UserOp still pending', {
            userOpId,
            tempId,
            attempts,
            maxAttempts: this.MAX_ATTEMPTS
          })

          // If we've tried too many times without throwing, also timeout here
          if (attempts >= this.MAX_ATTEMPTS) {
            console.log('[TransactionStatusMonitor] EIP-7702 UserOp pending too long, timing out', {
              userOpId,
              tempId
            })
            promiseManager.resolveTransactionPromise(tempId, false, 'UserOp confirmation timeout')
            this.eip7702Transactions.delete(userOpId)
            this.statusCheckCounts.delete(userOpId)
          }
        }
      } catch (error) {
        console.log('[TransactionStatusMonitor] EIP-7702 UserOp check error', {
          userOpId,
          tempId,
          error
        })

        const attempts = (this.statusCheckCounts.get(userOpId) || 0) + 1
        this.statusCheckCounts.set(userOpId, attempts)

        if (attempts >= this.MAX_ATTEMPTS) {
          console.log('[TransactionStatusMonitor] Giving up on EIP-7702 UserOp after errors', {
            userOpId,
            tempId,
            attempts
          })
          promiseManager.resolveTransactionPromise(tempId, false, 'UserOp confirmation timeout')
          this.eip7702Transactions.delete(userOpId)
          this.statusCheckCounts.delete(userOpId)
        }
      }
    }
  }
}

// Export singleton instance functions for convenience
export { TransactionStatusMonitor }
