import { Storage } from "@plasmohq/storage"
import type { StoredAccounts, NetworkSettings } from "~/types/account"

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
