import { Storage } from "@plasmohq/storage"
import type { StoredAccounts, NetworkSettings, StoredDAppPermissions, DAppPermission } from "~/types/account"

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
