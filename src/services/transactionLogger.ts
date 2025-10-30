import Dexie, { type Table } from 'dexie'
import type { Address } from 'viem'

export interface TransactionLog {
  id?: number // auto-increment primary key
  accountId: string
  chainId: number
  hash: string  // This will be on-chain transaction hash (when available)
  userOpHash?: string // UserOperation hash (primary identifier for UserOp txns)
  type: 'send' | 'receive' | 'contract' | 'user_operation_execution'
  from: Address
  to?: Address
  value: string
  gasUsed?: string
  gasPrice?: string
  gasSponsorship?: boolean
  status: 'pending' | 'success' | 'failed'
  timestamp: number
  blockNumber?: number
  errorMessage?: string
  isUserOpExecution?: boolean  // Flag: this transaction represents UserOp execution
  onChainTxHash?: string  // Final on-chain transaction hash
  metadata?: Record<string, any> // for risk engine data later
}

class TransactionDatabase extends Dexie {
  transactions!: Table<TransactionLog, number> // number is the key type (id)

  constructor() {
    super('SmartWalletDB')

    // Schema version 1: original schema
    this.version(1).stores({
      transactions: '++id, accountId, chainId, hash, status, timestamp, &[accountId+hash], [accountId+timestamp]'
    })

    // Schema version 2: add UserOperation fields
    this.version(2).stores({
      transactions: '++id, accountId, chainId, hash, status, timestamp, userOpHash, isUserOpExecution, &[accountId+hash], [accountId+timestamp]'
    }).upgrade((tx: any) => {
      // Upgrade existing records to have default values for new fields
      console.log('[TransactionLogger] Upgrading database to version 2...')
      // Existing records will have undefined for the new fields, which is fine
    })

    // Schema version 3: add onChainTxHash field
    this.version(3).stores({
      transactions: '++id, accountId, chainId, hash, status, timestamp, userOpHash, isUserOpExecution, onChainTxHash, &[accountId+hash], [accountId+timestamp]'
    }).upgrade((tx: any) => {
      // Upgrade existing records to have default values for new fields
      console.log('[TransactionLogger] Upgrading database to version 3...')
      // Existing records will have undefined for the new onChainTxHash field, which is fine
    })
  }
}

// Create singleton instance
const txDB = new TransactionDatabase()

export class TransactionLogger {
  /**
   * Log a new transaction
   */
  static async logTransaction(log: Omit<TransactionLog, 'id'>): Promise<number> {
    try {
      return await txDB.transactions.add(log)
    } catch (error) {
      console.error('[TransactionLogger] Failed to log transaction:', error)
      throw error
    }
  }

  /**
   * Update transaction status and additional info
   */
  static async updateTransaction(
    hash: string,
    updates: Partial<Omit<TransactionLog, 'id' | 'hash' | 'accountId'>>
  ): Promise<void> {
    try {
      const count = await txDB.transactions
        .where('hash')
        .equals(hash)
        .modify(updates)

      if (count === 0) {
        console.warn('[TransactionLogger] No transaction found with hash:', hash)
      }
    } catch (error) {
      console.error('[TransactionLogger] Failed to update transaction:', error)
      throw error
    }
  }

  /**
   * Get all transactions for an account (newest first)
   */
  static async getAccountTransactions(accountId: string, limit = 100): Promise<TransactionLog[]> {
    try {
      return await txDB.transactions
        .where('accountId')
        .equals(accountId)
        .reverse() // newest first
        .limit(limit)
        .toArray()
    } catch (error) {
      console.error('[TransactionLogger] Failed to get account transactions:', error)
      return []
    }
  }

  /**
   * Get recent transactions for an account (within last N days)
   */
  static async getRecentTransactions(accountId: string, days = 30): Promise<TransactionLog[]> {
    try {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
      return await txDB.transactions
        .where('[accountId+timestamp]')
        .between([accountId, cutoff], [accountId, Date.now()])
        .reverse()
        .toArray()
    } catch (error) {
      console.error('[TransactionLogger] Failed to get recent transactions:', error)
      return []
    }
  }

  /**
   * Get pending transactions for monitoring
   */
  static async getPendingTransactions(): Promise<string[]> {
    try {
      const pending = await txDB.transactions
        .where('status')
        .equals('pending')
        .toArray()

      return pending.map(tx => tx.hash)
    } catch (error) {
      console.error('[TransactionLogger] Failed to get pending transactions:', error)
      return []
    }
  }

  /**
   * Get transaction by hash
   */
  static async getTransaction(hash: string): Promise<TransactionLog | undefined> {
    try {
      return await txDB.transactions
        .where('hash')
        .equals(hash)
        .first()
    } catch (error) {
      console.error('[TransactionLogger] Failed to get transaction:', error)
      return undefined
    }
  }

  /**
   * Special update for when transaction gets on-chain hash (UserOperation execution)
   * This handles the case where we need to link UserOp hash to real transaction hash
   */
  static async linkUserOpToOnChainTx(userOpHash: string, onChainTxHash: string, status: 'success' | 'failed' = 'success'): Promise<void> {
    try {
      const count = await txDB.transactions
        .where('userOpHash')
        .equals(userOpHash)
        .modify({
          onChainTxHash,
          status
        })

      console.log(`[TransactionLogger] Linked ${userOpHash} → ${onChainTxHash}`)

      if (count === 0) {
        console.warn('[TransactionLogger] No transaction found for UserOp:', userOpHash)
      }
    } catch (error) {
      console.error('[TransactionLogger] Failed to link UserOp to on-chain transaction:', error)
      throw error
    }
  }

  /**
   * Delete old transactions (cleanup utility)
   */
  static async deleteOldTransactions(olderThanDays: number): Promise<number> {
    try {
      const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
      return await txDB.transactions
        .where('timestamp')
        .below(cutoff)
        .delete()
    } catch (error) {
      console.error('[TransactionLogger] Failed to cleanup old transactions:', error)
      return 0
    }
  }

  /**
   * Get database statistics
   */
  static async getStats() {
    try {
      const count = await txDB.transactions.count()
      const pending = await txDB.transactions.where('status').equals('pending').count()
      const success = await txDB.transactions.where('status').equals('success').count()
      const failed = await txDB.transactions.where('status').equals('failed').count()

      return {
        totalTransactions: count,
        pendingTransactions: pending,
        successfulTransactions: success,
        failedTransactions: failed
      }
    } catch (error) {
      console.error('[TransactionLogger] Failed to get stats:', error)
      return {
        totalTransactions: 0,
        pendingTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0
      }
    }
  }

  /**
   * Clear all transaction logs (for development/testing)
   */
  static async clearAll(): Promise<void> {
    try {
      await txDB.transactions.clear()
    } catch (error) {
      console.error('[TransactionLogger] Failed to clear transactions:', error)
      throw error
    }
  }
}

// Export the database instance for advanced operations
export { txDB }
