import { createLightAccountAlchemyClient } from "@alchemy/aa-alchemy"
import { LocalAccountSigner } from "@alchemy/aa-core"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { Chain, Address } from "viem"
import type { WalletAccount } from "~/types/account"
import { getStoredAccounts, saveAccounts, setActiveAccountId } from "~/utils/storage"
import { getAlchemyRpcUrl } from "~/config/alchemy"

/**
 * Create a new Smart Account using Alchemy Light Account
 */
export async function createSmartAccount(
  name: string,
  chain: Chain
): Promise<WalletAccount> {
  try {
    // Generate a new private key for the EOA signer
    const privateKey = generatePrivateKey()
    const eoaAccount = privateKeyToAccount(privateKey)

    // Create a local account signer from the EOA
    const signer = new LocalAccountSigner(eoaAccount)

    // Create the Light Account client
    const client = await createLightAccountAlchemyClient({
      chain,
      signer,
      rpcUrl: getAlchemyRpcUrl(chain)
    })

    // Get the smart account address
    const address = client.account.address

    // Create the wallet account object
    const account: WalletAccount = {
      id: `account_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      address,
      privateKey, // Note: In production, this should be encrypted
      createdAt: Date.now(),
      lastUsed: Date.now()
    }

    // Store the account
    const stored = await getStoredAccounts()
    stored.accounts.push(account)

    // Set as active if it's the first account
    if (stored.accounts.length === 1) {
      stored.activeAccountId = account.id
    }

    await saveAccounts(stored)

    return account
  } catch (error) {
    console.error("Error creating smart account:", error)
    throw new Error(`Failed to create smart account: ${error.message}`)
  }
}

/**
 * Get all accounts from storage
 */
export async function getAllAccounts(): Promise<WalletAccount[]> {
  const stored = await getStoredAccounts()
  return stored.accounts
}

/**
 * Get active account
 */
export async function getActiveAccount(): Promise<WalletAccount | null> {
  const stored = await getStoredAccounts()
  if (!stored.activeAccountId) return null

  return stored.accounts.find(acc => acc.id === stored.activeAccountId) || null
}

/**
 * Switch active account
 */
export async function switchAccount(accountId: string): Promise<void> {
  const stored = await getStoredAccounts()
  const account = stored.accounts.find(acc => acc.id === accountId)

  if (!account) {
    throw new Error("Account not found")
  }

  // Update last used timestamp
  account.lastUsed = Date.now()
  await setActiveAccountId(accountId)
  await saveAccounts(stored)
}

/**
 * Delete an account
 */
export async function deleteAccount(accountId: string): Promise<void> {
  const stored = await getStoredAccounts()
  const index = stored.accounts.findIndex(acc => acc.id === accountId)

  if (index === -1) {
    throw new Error("Account not found")
  }

  stored.accounts.splice(index, 1)

  // If deleting active account, switch to first available
  if (stored.activeAccountId === accountId) {
    stored.activeAccountId = stored.accounts.length > 0 ? stored.accounts[0].id : null
  }

  await saveAccounts(stored)
}

/**
 * Rename an account
 */
export async function renameAccount(accountId: string, newName: string): Promise<void> {
  const stored = await getStoredAccounts()
  const account = stored.accounts.find(acc => acc.id === accountId)

  if (!account) {
    throw new Error("Account not found")
  }

  account.name = newName
  await saveAccounts(stored)
}

/**
 * Get a Light Account client for a specific account
 */
export async function getAccountClient(accountId: string, chain: Chain) {
  const stored = await getStoredAccounts()
  const account = stored.accounts.find(acc => acc.id === accountId)

  if (!account) {
    throw new Error("Account not found")
  }

  // Recreate the signer from stored private key
  const eoaAccount = privateKeyToAccount(account.privateKey as `0x${string}`)
  const signer = new LocalAccountSigner(eoaAccount)

  // Create the Light Account client
  const client = await createLightAccountAlchemyClient({
    chain,
    signer,
    rpcUrl: getAlchemyRpcUrl(chain)
  })

  return client
}
