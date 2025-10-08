import { createLightAccountAlchemyClient } from "@alchemy/aa-alchemy"
import { LocalAccountSigner, sepolia as alchemySepolia } from "@alchemy/aa-core"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { Chain, Address } from "viem"
import { sepolia, mainnet, polygon, optimism, arbitrum, base } from "viem/chains"
import type { WalletAccount } from "~/types/account"
import { getStoredAccounts, saveAccounts, setActiveAccountId } from "~/utils/storage"
import {ALCHEMY_API_KEY, getAlchemyRpcUrl} from "~/config/alchemy"

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

    console.log('[Wallet] EOA account created:', {
      address: eoaAccount.address,
      hasPrivateKey: !!privateKey
    })

    // Create a local account signer from the EOA
    const signer = new LocalAccountSigner(eoaAccount)

    console.log('[Wallet] Local account signer created')

    // Validate API key
    if (!ALCHEMY_API_KEY) {
      throw new Error("Alchemy API key not configured. Please set PLASMO_PUBLIC_ALCHEMY_API_KEY in your environment.")
    }

    console.log('[Wallet] Creating smart account with:', {
      chainId: chain.id,
      chainName: chain.name,
      hasApiKey: !!ALCHEMY_API_KEY,
      apiKeyLength: ALCHEMY_API_KEY.length,
      chainType: typeof chain,
      chainConstructor: chain.constructor?.name,
      hasRpcUrls: !!chain.rpcUrls,
      rpcUrlsKeys: chain.rpcUrls ? Object.keys(chain.rpcUrls) : []
    })

    // Map viem chain to Alchemy AA chain
    // Alchemy AA has its own chain definitions that work with their SDK
    const alchemyChain = chain.id === sepolia.id ? alchemySepolia : chain

    console.log('[Wallet] Using Alchemy chain:', {
      originalChainId: chain.id,
      alchemyChainId: alchemyChain.id,
      isAlchemyChain: alchemyChain === alchemySepolia,
      alchemyChainName: alchemyChain.name
    })

    console.log('[Wallet] About to call createLightAccountAlchemyClient...')

    // Create the Light Account client
    let client
    let address
    try {
      client = await createLightAccountAlchemyClient({
        apiKey: ALCHEMY_API_KEY,
        chain: alchemyChain,
        signer,
      })

      console.log('[Wallet] Smart account client created successfully')
      console.log('[Wallet] Client account address:', client.account.address)

      // Get the smart account address
      address = client.account.address
    } catch (clientError) {
      console.error('[Wallet] Error creating Light Account client:', clientError)
      console.error('[Wallet] Error name:', clientError.name)
      console.error('[Wallet] Error message:', clientError.message)
      console.error('[Wallet] Error stack:', clientError.stack)

      // Log the full error object
      console.error('[Wallet] Full error object:', JSON.stringify(clientError, Object.getOwnPropertyNames(clientError)))

      throw new Error(`Failed to create Light Account client: ${clientError.message}`)
    }

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

  // Validate API key
  if (!ALCHEMY_API_KEY) {
    throw new Error("Alchemy API key not configured. Please set PLASMO_PUBLIC_ALCHEMY_API_KEY in your environment.")
  }

  console.log('[Wallet] Creating Light Account client with:', {
    accountId,
    chainId: chain.id,
    chainName: chain.name,
    hasApiKey: !!ALCHEMY_API_KEY,
    chainType: typeof chain,
    chainConstructor: chain.constructor?.name,
    hasRpcUrls: !!chain.rpcUrls,
    rpcUrlsKeys: chain.rpcUrls ? Object.keys(chain.rpcUrls) : []
  })

  // Map viem chain to Alchemy AA chain
  const alchemyChain = chain.id === sepolia.id ? alchemySepolia : chain

  console.log('[Wallet] Using Alchemy chain:', {
    originalChainId: chain.id,
    alchemyChainId: alchemyChain.id,
    isAlchemyChain: alchemyChain === alchemySepolia
  })

  console.log('[Wallet] About to create Light Account client...')
  console.log('[Wallet] Signer address:', await signer.getAddress())
  console.log('[Wallet] Account address from storage:', account.address)

  // Create the Light Account client
  try {
    const client = await createLightAccountAlchemyClient({
      apiKey: ALCHEMY_API_KEY,
      chain: alchemyChain,
      signer,
      // Pass the account address to avoid recalculation
      accountAddress: account.address as `0x${string}`,
    })

    console.log('[Wallet] Light Account client created successfully')
    console.log('[Wallet] Client account address:', client.account.address)

    return client
  } catch (error) {
    console.error('[Wallet] Error creating Light Account client:', error)
    console.error('[Wallet] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    })
    throw error
  }
}
