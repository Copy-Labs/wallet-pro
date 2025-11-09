import { toast } from "sonner"

interface TransactionPromise {
  id: string
  toastId: string | number
  resolve: (value: any) => void
  reject: (error: any) => void
  promise: Promise<any>
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
    return new Promise((resolve, reject) => {
      const toastId = toast.loading(description, {
        duration: Infinity, // Keep loading until resolved
      })

      const promise: TransactionPromise = {
        id: txId,
        toastId,
        resolve,
        reject,
        promise: null!, // Will be set below
        description,
        createdAt: Date.now(),
      }

      // Create the actual promise and store it
      promise.promise = new Promise((res, rej) => {
        promise.resolve = (value) => {
          toast.success(`Transaction confirmed!`, { id: toastId })
          res(value)
        }
        promise.reject = (error) => {
          toast.error(`Transaction failed: ${error}`, { id: toastId })
          rej(error)
        }
      })

      this.pendingPromises.set(txId, promise)
    })
  }

  resolveTransactionPromise(txId: string, success: boolean, message?: string) {
    const promiseData = this.pendingPromises.get(txId)
    if (!promiseData) return

    if (success) {
      promiseData.resolve({ txId, message })
    } else {
      promiseData.reject(message || 'Transaction failed')
    }

    this.pendingPromises.delete(txId)
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
