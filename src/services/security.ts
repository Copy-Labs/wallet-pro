/**
 * Security Service
 * Manages password, session, and lock state
 */

import browser from 'webextension-polyfill'
import { hashPassword, verifyPassword, validatePasswordStrength } from './encryption'

// Storage keys
const STORAGE_KEYS = {
  PASSWORD_HASH: 'security_password_hash',
  IS_LOCKED: 'security_is_locked',
  LAST_ACTIVITY: 'security_last_activity',
  AUTO_LOCK_TIMEOUT: 'security_auto_lock_timeout',
  IS_INITIALIZED: 'security_is_initialized'
}

// Default auto-lock timeout (5 minutes)
const DEFAULT_AUTO_LOCK_TIMEOUT = 5 * 60 * 1000

/**
 * Security state interface
 */
export interface SecurityState {
  isInitialized: boolean
  isLocked: boolean
  lastActivity: number
  autoLockTimeout: number
}

/**
 * Check if wallet is initialized with a password
 */
export async function isWalletInitialized(): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEYS.IS_INITIALIZED)
  return result[STORAGE_KEYS.IS_INITIALIZED] === true
}

/**
 * Initialize wallet with a password
 */
export async function initializeWallet(password: string): Promise<void> {
  // Validate password strength
  const validation = validatePasswordStrength(password)
  if (!validation.valid) {
    throw new Error(`Weak password: ${validation.errors.join(', ')}`)
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Store password hash and initialize state
  await browser.storage.local.set({
    [STORAGE_KEYS.PASSWORD_HASH]: passwordHash,
    [STORAGE_KEYS.IS_INITIALIZED]: true,
    [STORAGE_KEYS.IS_LOCKED]: false,
    [STORAGE_KEYS.LAST_ACTIVITY]: Date.now(),
    [STORAGE_KEYS.AUTO_LOCK_TIMEOUT]: DEFAULT_AUTO_LOCK_TIMEOUT
  })

  console.log('[Security] Wallet initialized with password')
}

/**
 * Verify password
 */
export async function verifyWalletPassword(password: string): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEYS.PASSWORD_HASH)
  const passwordHash = result[STORAGE_KEYS.PASSWORD_HASH]

  if (!passwordHash) {
    throw new Error('Wallet not initialized')
  }

  return verifyPassword(password, passwordHash)
}

/**
 * Change wallet password
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  // Verify old password
  const isValid = await verifyWalletPassword(oldPassword)
  if (!isValid) {
    throw new Error('Incorrect current password')
  }

  // Validate new password strength
  const validation = validatePasswordStrength(newPassword)
  if (!validation.valid) {
    throw new Error(`Weak password: ${validation.errors.join(', ')}`)
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword)

  // Update password hash
  await browser.storage.local.set({
    [STORAGE_KEYS.PASSWORD_HASH]: newPasswordHash
  })

  console.log('[Security] Password changed successfully')
}

/**
 * Check if wallet is locked
 */
export async function isWalletLocked(): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEYS.IS_LOCKED)
  return result[STORAGE_KEYS.IS_LOCKED] === true
}

/**
 * Lock wallet
 */
export async function lockWallet(): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.IS_LOCKED]: true
  })

  console.log('[Security] Wallet locked')

  // Notify all tabs that wallet is locked
  browser.runtime.sendMessage({
    type: 'WALLET_LOCKED'
  }).catch(() => {
    // Ignore errors if no listeners
  })
}

/**
 * Unlock wallet with password
 */
export async function unlockWallet(password: string): Promise<void> {
  // Verify password
  const isValid = await verifyWalletPassword(password)
  if (!isValid) {
    throw new Error('Incorrect password')
  }

  // Unlock wallet
  await browser.storage.local.set({
    [STORAGE_KEYS.IS_LOCKED]: false,
    [STORAGE_KEYS.LAST_ACTIVITY]: Date.now()
  })

  console.log('[Security] Wallet unlocked')

  // Notify all tabs that wallet is unlocked
  browser.runtime.sendMessage({
    type: 'WALLET_UNLOCKED'
  }).catch(() => {
    // Ignore errors if no listeners
  })
}

/**
 * Update last activity timestamp
 */
export async function updateLastActivity(): Promise<void> {
  await browser.storage.local.set({
    [STORAGE_KEYS.LAST_ACTIVITY]: Date.now()
  })
}

/**
 * Get auto-lock timeout
 */
export async function getAutoLockTimeout(): Promise<number> {
  const result = await browser.storage.local.get(STORAGE_KEYS.AUTO_LOCK_TIMEOUT)
  return result[STORAGE_KEYS.AUTO_LOCK_TIMEOUT] || DEFAULT_AUTO_LOCK_TIMEOUT
}

/**
 * Set auto-lock timeout
 */
export async function setAutoLockTimeout(timeout: number): Promise<void> {
  if (timeout < 0) {
    throw new Error('Timeout must be positive')
  }

  await browser.storage.local.set({
    [STORAGE_KEYS.AUTO_LOCK_TIMEOUT]: timeout
  })

  console.log('[Security] Auto-lock timeout set to', timeout, 'ms')
}

/**
 * Check if wallet should auto-lock
 */
export async function checkAutoLock(): Promise<boolean> {
  const isLocked = await isWalletLocked()
  if (isLocked) {
    return true
  }

  const result = await browser.storage.local.get([
    STORAGE_KEYS.LAST_ACTIVITY,
    STORAGE_KEYS.AUTO_LOCK_TIMEOUT
  ])

  const lastActivity = result[STORAGE_KEYS.LAST_ACTIVITY] || 0
  const timeout = result[STORAGE_KEYS.AUTO_LOCK_TIMEOUT] || DEFAULT_AUTO_LOCK_TIMEOUT

  const timeSinceLastActivity = Date.now() - lastActivity

  if (timeSinceLastActivity > timeout) {
    await lockWallet()
    return true
  }

  return false
}

/**
 * Get security state
 */
export async function getSecurityState(): Promise<SecurityState> {
  const result = await browser.storage.local.get([
    STORAGE_KEYS.IS_INITIALIZED,
    STORAGE_KEYS.IS_LOCKED,
    STORAGE_KEYS.LAST_ACTIVITY,
    STORAGE_KEYS.AUTO_LOCK_TIMEOUT
  ])

  return {
    isInitialized: result[STORAGE_KEYS.IS_INITIALIZED] === true,
    isLocked: result[STORAGE_KEYS.IS_LOCKED] === true,
    lastActivity: result[STORAGE_KEYS.LAST_ACTIVITY] || 0,
    autoLockTimeout: result[STORAGE_KEYS.AUTO_LOCK_TIMEOUT] || DEFAULT_AUTO_LOCK_TIMEOUT
  }
}

/**
 * Start auto-lock timer
 * Should be called from background script
 */
export function startAutoLockTimer(): void {
  // Check every minute
  setInterval(async () => {
    await checkAutoLock()
  }, 60 * 1000)

  console.log('[Security] Auto-lock timer started')
}

/**
 * Reset wallet (for testing/development only)
 */
export async function resetWallet(): Promise<void> {
  await browser.storage.local.remove([
    STORAGE_KEYS.PASSWORD_HASH,
    STORAGE_KEYS.IS_INITIALIZED,
    STORAGE_KEYS.IS_LOCKED,
    STORAGE_KEYS.LAST_ACTIVITY,
    STORAGE_KEYS.AUTO_LOCK_TIMEOUT
  ])

  console.log('[Security] Wallet reset')
}

