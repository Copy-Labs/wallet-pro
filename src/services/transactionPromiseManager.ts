import { toast } from "sonner"

interface TransactionPromise {
  id: string
  toastId: string | number
  resolve: (value: any) => void
  reject: (error: any) => void
  description: string
  createdAt: number
}

class TransactionPromiseManager {
  private static instance: TransactionPromiseManager
  private pendingPromises = new Map<string, TransactionPromise>()

  static getInstance(): TransactionPromiseManager {
    if (!TransactionPromiseManager.instance) {
      TransactionPromiseManager.instance = new TransactionPromiseManager()
    }
    return TransactionPromiseManager.instance
  }

  createTransactionPromise(txId: string, description: string): Promise<any> {
    console.log('[TransactionPromiseManager] Creating transaction promise', { txId, description })

    const toastId = toast.loading(description, {
      id: txId,
      duration: Infinity
    })

    const promise = new Promise<any>((resolve, reject) => {
      const promiseData: TransactionPromise = {
        id: txId,
        toastId,
        // NOTE:
        // We keep resolve/reject "raw" here.
        // Toast updates and payload shaping are handled in resolveTransactionPromise.
        resolve: (value: any) => {
          toast.dismiss(toastId);
          resolve(value)
        },
        reject: (error: any) => {
          toast.dismiss(toastId);
          reject(error)
        },
        description,
        createdAt: Date.now()
      }

      this.pendingPromises.set(txId, promiseData)
      console.log('[TransactionPromiseManager] Registered pending promise', { txId })
    })

    return promise
  }

  resolveTransactionPromise(txId: string, success: boolean, message?: string) {
    const promiseData = this.pendingPromises.get(txId)
    if (!promiseData) {
      console.log('[TransactionPromiseManager] No pending promise found to resolve', { txId, success, message })
      return
    }

    try {
      if (success) {
        const finalMessage = message || 'Transaction confirmed!'
        toast.success(finalMessage, { id: promiseData.toastId })
        promiseData.resolve({
          txId,
          success: true,
          message: finalMessage
        })
      } else {
        const finalMessage = message || 'Transaction failed'
        toast.error(finalMessage, { id: promiseData.toastId })
        promiseData.reject(new Error(finalMessage))
      }
    } finally {
      this.pendingPromises.delete(txId)
      console.log('[TransactionPromiseManager] Cleared pending promise', { txId })
    }
  }

  // Cleanup old promises (older than 10 minutes)
  cleanupOldPromises() {
    const cutoff = Date.now() - (10 * 60 * 1000)
    for (const [txId, promise] of this.pendingPromises) {
      if (promise.createdAt < cutoff) {
        promise.reject('Transaction timeout')
        toast.dismiss(promise.toastId)
        this.pendingPromises.delete(txId)
      }
    }
  }

  getPendingPromises(): TransactionPromise[] {
    return Array.from(this.pendingPromises.values())
  }
}

export { TransactionPromiseManager }
