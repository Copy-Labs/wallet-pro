import { Storage } from "@plasmohq/storage"
import type { StoredAccounts, NetworkSettings, StoredDAppPermissions, DAppPermission, StoredUserSettings, UserSettings, LoggedTransaction, TransactionHistory } from "~/types/account"

const storage = new Storage()

// Account storage keys
const ACCOUNTS_KEY = "wallet_accounts"
const NETWORK_KEY = "wallet_network"

// Account Management
export async function getStoredAccounts(): Promise<StoredAccounts> {
  const data = await storage.get<StoredAccounts>(ACCOUNTS_KEY)
  return data || { accounts: [], activeAccountId: null }
}

export async function saveAccounts(data: StoredAccounts): Promise<void> {
  await storage.set(ACCOUNTS_KEY, data)
}

export async function getActiveAccountId(): Promise<string | null> {
  const data = await getStoredAccounts()
  return data.activeAccountId
}

export async function setActiveAccountId(accountId: string): Promise<void> {
  const data = await getStoredAccounts()
  data.activeAccountId = accountId
  await saveAccounts(data)
}

// Network Management
export async function getSelectedNetwork(): Promise<number | null> {
  const data = await storage.get<NetworkSettings>(NETWORK_KEY)
  return data?.selectedChainId || null
}

export async function saveSelectedNetwork(chainId: number): Promise<void> {
  await storage.set(NETWORK_KEY, { selectedChainId: chainId })
}

// DApp Permissions Management
const DAPPS_KEY = "wallet_dapp_permissions"

export async function getStoredDAppPermissions(): Promise<StoredDAppPermissions> {
  const data = await storage.get<StoredDAppPermissions>(DAPPS_KEY)
  return data || { permissions: [] }
}

export async function saveDAppPermissions(data: StoredDAppPermissions): Promise<void> {
  await storage.set(DAPPS_KEY, data)
}

export async function addDAppPermission(origin: string, accountId: string): Promise<void> {
  const data = await getStoredDAppPermissions()

  // Remove any existing permission for this origin
  data.permissions = data.permissions.filter(p => p.origin !== origin)

  // Add new permission
  data.permissions.push({
    origin,
    accountId,
    connectedAt: Date.now(),
    lastUsed: Date.now()
  })

  await saveDAppPermissions(data)
}

export async function removeDAppPermission(origin: string): Promise<void> {
  const data = await getStoredDAppPermissions()
  data.permissions = data.permissions.filter(p => p.origin !== origin)
  await saveDAppPermissions(data)
}

export async function getDAppPermission(origin: string): Promise<DAppPermission | null> {
  const data = await getStoredDAppPermissions()
  return data.permissions.find(p => p.origin === origin) || null
}

export async function updateDAppPermissionLastUsed(origin: string): Promise<void> {
  const data = await getStoredDAppPermissions()
  const permission = data.permissions.find(p => p.origin === origin)
  if (permission) {
    permission.lastUsed = Date.now()
    await saveDAppPermissions(data)
  }
}

// User Settings Management
const SETTINGS_KEY = "wallet_user_settings"

const DEFAULT_SETTINGS: UserSettings = {
  enableGasSponsorship: true,
  sponsorshipThresholdUSD: 1.0
}

export async function getStoredUserSettings(): Promise<StoredUserSettings> {
  const data = await storage.get<StoredUserSettings>(SETTINGS_KEY)
  return data || { settings: DEFAULT_SETTINGS }
}

export async function getUserSettings(): Promise<UserSettings> {
  const data = await getStoredUserSettings()
  return data.settings
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  await storage.set(SETTINGS_KEY, { settings })
}

export async function updateUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  const settings = await getUserSettings()
  settings[key] = value
  await saveUserSettings(settings)
}

// Transaction Logging Management
const LOG_KEY_PREFIX = "wallet_transaction_log_"

export async function logTransaction(accountId: string, transaction: LoggedTransaction): Promise<void> {
  const key = `${LOG_KEY_PREFIX}${accountId}`
  const existingLogs = await storage.get<LoggedTransaction[]>(key) || []

  // Keep only the last 100 transactions per account to avoid storage bloat
  existingLogs.unshift(transaction)
  if (existingLogs.length > 100) {
    existingLogs.pop()
  }

  await storage.set(key, existingLogs)
}

export async function getLoggedTransactions(accountId: string): Promise<LoggedTransaction[]> {
  const key = `${LOG_KEY_PREFIX}${accountId}`
  return await storage.get<LoggedTransaction[]>(key) || []
}

export async function clearTransactionLogs(accountId: string): Promise<void> {
  const key = `${LOG_KEY_PREFIX}${accountId}`
  await storage.set(key, [])
}

// Helper: Check if address is known recipient
export async function checkKnownRecipient(accountId: string, address: string): Promise<boolean> {
  const logs = await getLoggedTransactions(accountId)
  return logs.some(tx => tx.to.toLowerCase() === address.toLowerCase())
}

// Helper: Analyze transaction for risk factors
export async function analyzeTransactionRisk(
  accountId: string,
  amountETH: number,
  recipientAddress: string
): Promise<{ highValue: boolean; newRecipient: boolean; unusualAmount: boolean; score: number }> {
  const logs = await getLoggedTransactions(accountId)

  // High value: >0.1 ETH
  const highValue = amountETH > 0.1

  // New recipient
  const knownRecipients = new Set(logs.map(tx => tx.to.toLowerCase()))
  const newRecipient = !knownRecipients.has(recipientAddress.toLowerCase())

  // Unusual amount: Check if differs significantly from average
  const sentAmounts = logs
    .filter(tx => tx.type === 'send' && tx.status === 'success')
    .map(tx => parseFloat(tx.value))
    .filter(val => !isNaN(val))

  let unusualAmount = false
  if (sentAmounts.length > 0) {
    const avgAmount = sentAmounts.reduce((sum, val) => sum + val, 0) / sentAmounts.length
    const stdDev = Math.sqrt(sentAmounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / sentAmounts.length)
    unusualAmount = Math.abs(amountETH - avgAmount) > stdDev * 2 // 2 standard deviations
  }

  // Calculate risk score (0-10)
  let score = 0
  if (highValue) score += 3
  if (newRecipient) score += 2
  if (unusualAmount) score += 3
  if (amountETH > 1) score += 2 // Very high value

  return {
    highValue,
    newRecipient,
    unusualAmount,
    score: Math.min(score, 10)
  }
}
