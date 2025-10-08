/**
 * Recovery Service
 * Handles seed phrase generation, backup, and account recovery
 */

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { HDKey } from '@scure/bip32'
import { privateKeyToAccount } from 'viem/accounts'
import browser from 'webextension-polyfill'
import { encryptWithPassword, decryptWithPassword } from './encryption'
import type { WalletAccount } from '~/types/account'

// Storage keys
const STORAGE_KEYS = {
  ENCRYPTED_MNEMONIC: 'recovery_encrypted_mnemonic',
  HAS_BACKUP: 'recovery_has_backup',
  BACKUP_TIMESTAMP: 'recovery_backup_timestamp'
}

// BIP-44 derivation path for Ethereum
// m/44'/60'/0'/0/index
const ETHEREUM_DERIVATION_PATH = "m/44'/60'/0'/0"

/**
 * Generate a new BIP-39 mnemonic (12 words)
 */
export function generateSeedPhrase(): string {
  return generateMnemonic(128) // 128 bits = 12 words
}

/**
 * Validate a seed phrase
 */
export function validateSeedPhrase(mnemonic: string): boolean {
  return validateMnemonic(mnemonic)
}

/**
 * Derive private key from seed phrase at specific index
 */
export function derivePrivateKeyFromSeed(mnemonic: string, index: number = 0): string {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed phrase')
  }

  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(mnemonic)

  // Create HD key from seed
  const hdKey = HDKey.fromMasterSeed(seed)

  // Derive key at path
  const path = `${ETHEREUM_DERIVATION_PATH}/${index}`
  const derivedKey = hdKey.derive(path)

  if (!derivedKey.privateKey) {
    throw new Error('Failed to derive private key')
  }

  // Convert to hex string
  return '0x' + Buffer.from(derivedKey.privateKey).toString('hex')
}

/**
 * Derive multiple accounts from seed phrase
 */
export function deriveAccountsFromSeed(
  mnemonic: string,
  count: number = 1,
  startIndex: number = 0
): Array<{ privateKey: string; address: string; index: number }> {
  const accounts = []

  for (let i = 0; i < count; i++) {
    const index = startIndex + i
    const privateKey = derivePrivateKeyFromSeed(mnemonic, index)
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    accounts.push({
      privateKey,
      address: account.address,
      index
    })
  }

  return accounts
}

/**
 * Save encrypted seed phrase
 */
export async function saveSeedPhrase(mnemonic: string, password: string): Promise<void> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed phrase')
  }

  // Encrypt mnemonic with password
  const encrypted = await encryptWithPassword(mnemonic, password)

  // Save to storage
  await browser.storage.local.set({
    [STORAGE_KEYS.ENCRYPTED_MNEMONIC]: encrypted,
    [STORAGE_KEYS.HAS_BACKUP]: true,
    [STORAGE_KEYS.BACKUP_TIMESTAMP]: Date.now()
  })

  console.log('[Recovery] Seed phrase saved and encrypted')
}

/**
 * Retrieve and decrypt seed phrase
 */
export async function getSeedPhrase(password: string): Promise<string> {
  const result = await browser.storage.local.get(STORAGE_KEYS.ENCRYPTED_MNEMONIC)
  const encrypted = result[STORAGE_KEYS.ENCRYPTED_MNEMONIC]

  if (!encrypted) {
    throw new Error('No seed phrase found')
  }

  // Decrypt mnemonic
  const mnemonic = await decryptWithPassword(encrypted, password)

  if (!validateMnemonic(mnemonic)) {
    throw new Error('Decrypted seed phrase is invalid')
  }

  return mnemonic
}

/**
 * Check if seed phrase backup exists
 */
export async function hasSeedPhrase(): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEYS.HAS_BACKUP)
  return result[STORAGE_KEYS.HAS_BACKUP] === true
}

/**
 * Get backup timestamp
 */
export async function getBackupTimestamp(): Promise<number | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.BACKUP_TIMESTAMP)
  return result[STORAGE_KEYS.BACKUP_TIMESTAMP] || null
}

/**
 * Export account data (encrypted)
 */
export async function exportAccountData(password: string): Promise<string> {
  // Get all data from storage
  const allData = await browser.storage.local.get(null)

  // Create export object
  const exportData = {
    version: '1.0',
    timestamp: Date.now(),
    data: allData
  }

  // Encrypt export data
  const encrypted = await encryptWithPassword(JSON.stringify(exportData), password)

  return encrypted
}

/**
 * Import account data (encrypted)
 */
export async function importAccountData(encryptedData: string, password: string): Promise<void> {
  try {
    // Decrypt data
    const decrypted = await decryptWithPassword(encryptedData, password)
    const importData = JSON.parse(decrypted)

    // Validate format
    if (!importData.version || !importData.data) {
      throw new Error('Invalid backup format')
    }

    // Clear existing data
    await browser.storage.local.clear()

    // Import data
    await browser.storage.local.set(importData.data)

    console.log('[Recovery] Account data imported successfully')
  } catch (error) {
    console.error('[Recovery] Import failed:', error)
    throw new Error('Failed to import account data - incorrect password or corrupted file')
  }
}

/**
 * Create backup file
 */
export function createBackupFile(encryptedData: string): Blob {
  const backupData = {
    name: 'Smart Wallet Pro Backup',
    version: '1.0',
    timestamp: Date.now(),
    data: encryptedData
  }

  return new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json'
  })
}

/**
 * Parse backup file
 */
export async function parseBackupFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const backup = JSON.parse(content)

        if (!backup.data) {
          reject(new Error('Invalid backup file format'))
          return
        }

        resolve(backup.data)
      } catch (error) {
        reject(new Error('Failed to parse backup file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read backup file'))
    }

    reader.readAsText(file)
  })
}

/**
 * Recover accounts from seed phrase
 */
export async function recoverFromSeedPhrase(
  mnemonic: string,
  password: string,
  accountCount: number = 1
): Promise<void> {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed phrase')
  }

  // Save seed phrase
  await saveSeedPhrase(mnemonic, password)

  console.log('[Recovery] Accounts recovered from seed phrase')
}

/**
 * Delete seed phrase (dangerous!)
 */
export async function deleteSeedPhrase(): Promise<void> {
  await browser.storage.local.remove([
    STORAGE_KEYS.ENCRYPTED_MNEMONIC,
    STORAGE_KEYS.HAS_BACKUP,
    STORAGE_KEYS.BACKUP_TIMESTAMP
  ])

  console.log('[Recovery] Seed phrase deleted')
}

