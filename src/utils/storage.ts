import { Storage } from "@plasmohq/storage"
import type { StoredAccounts, NetworkSettings } from "~/types/account"
import { E_NetworkType } from "~/types/network"

const storage = new Storage()

// Account storage keys
const ACCOUNTS_KEY = "wallet_accounts"
const NETWORK_KEY = "wallet_network"
const NETWORK_TYPE_KEY = "wallet_network_type"
const PREF_NETWORK_PER_TYPE_KEY = "wallet_preferred_networks_per_type"

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

// Network Type Management
export async function getSelectedNetworkType(): Promise<E_NetworkType> {
  const data = await storage.get<E_NetworkType>(NETWORK_TYPE_KEY)
  return data || E_NetworkType.MAINNET // Default to mainnet
}

export async function saveSelectedNetworkType(networkType: E_NetworkType): Promise<void> {
  await storage.set(NETWORK_TYPE_KEY, networkType)
}

// Preferred Network per Type Management
export async function getPreferredNetworksPerType(): Promise<Record<E_NetworkType, number | null>> {
  const data = await storage.get<Record<E_NetworkType, number | null>>(PREF_NETWORK_PER_TYPE_KEY)
  return data || { [E_NetworkType.MAINNET]: null, [E_NetworkType.TESTNET]: null }
}

export async function savePreferredNetworkForType(networkType: E_NetworkType, chainId: number): Promise<void> {
  const current = await getPreferredNetworksPerType()
  current[networkType] = chainId
  await storage.set(PREF_NETWORK_PER_TYPE_KEY, current)
}
