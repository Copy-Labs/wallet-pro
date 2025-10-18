import { createLightAccountAlchemyClient } from "@alchemy/aa-alchemy"
import { LocalAccountSigner } from "@alchemy/aa-core"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { Chain, Address, Hex } from "viem"
import type { WalletAccount } from "~/types/account"
import { getStoredAccounts, saveAccounts, setActiveAccountId } from "~/utils/storage"
import {ALCHEMY_API_KEY, getAlchemyRpcUrl} from "~/config/alchemy"
import { getGasManagerConfig, isGasSponsorshipEnabled } from "~/config/gasManager"
import { getAlchemyChain, defaultChain } from "~/config/chains"
import { encryptWithPassword, decryptWithPassword } from "./encryption"
import { isWalletInitialized, isWalletLocked } from "./security"

/**
 * Create a new Smart Account using Alchemy Light Account
 * @param name - Account name
 * @param chainOrPrivateKey - Either a Chain object or a private key (Hex string). If omitted, uses default chain and generates new key
 * @returns The created wallet account
 */
export async function createSmartAccount(
  name: string,
  chainOrPrivateKey?: Chain | Hex
): Promise<WalletAccount> {
  try {
    // Determine if second parameter is a chain or private key
    let chain: Chain
    let privateKey: Hex

    if (!chainOrPrivateKey) {
      // No second parameter - use default chain and generate new key
      chain = defaultChain
      privateKey = generatePrivateKey()
    } else if (typeof chainOrPrivateKey === 'string') {
      // String parameter - it's a private key, use default chain
      chain = defaultChain
      privateKey = chainOrPrivateKey as Hex
    } else {
      // Object parameter - it's a chain, generate new key
      chain = chainOrPrivateKey
      privateKey = generatePrivateKey()
    }

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
    const alchemyChain = getAlchemyChain(chain.id)

    console.log('[Wallet] Using Alchemy chain:', {
      originalChainId: chain.id,
      alchemyChainId: alchemyChain.id,
      alchemyChainName: alchemyChain.name
    })

    console.log('[Wallet] About to call createLightAccountAlchemyClient...')

    // Get gas manager configuration
    const gasManagerConfig = getGasManagerConfig()
    const gasSponsorshipEnabled = isGasSponsorshipEnabled()

    console.log('[Wallet] Gas sponsorship:', {
      enabled: gasSponsorshipEnabled,
      hasPolicyId: !!gasManagerConfig?.policyId
    })

    // Create the Light Account client
    let client
    let address
    try {
      client = await createLightAccountAlchemyClient({
        apiKey: ALCHEMY_API_KEY,
        chain: alchemyChain,
        signer,
        gasManagerConfig,
      })

      console.log('[Wallet] Smart account client created successfully')
      console.log('[Wallet] Client account address:', client.account.address)
      console.log('[Wallet] Gas sponsorship active:', gasSponsorshipEnabled)

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

  // Update last used timestamp and active account ID in one operation
  account.lastUsed = Date.now()
  stored.activeAccountId = accountId

  // Single storage write to avoid double triggering storage watcher
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
  const alchemyChain = getAlchemyChain(chain.id)

  console.log('[Wallet] Using Alchemy chain:', {
    originalChainId: chain.id,
    alchemyChainId: alchemyChain.id,
    alchemyChainName: alchemyChain.name
  })

  console.log('[Wallet] About to create Light Account client...')
  console.log('[Wallet] Signer address:', await signer.getAddress())
  console.log('[Wallet] Account address from storage:', account.address)

  // Get gas manager configuration
  const gasManagerConfig = await getGasManagerConfig()
  const gasSponsorshipEnabled = await isGasSponsorshipEnabled()

  console.log('[Wallet] Gas sponsorship:', {
    enabled: gasSponsorshipEnabled,
    hasPolicyId: !!gasManagerConfig?.policyId
  })

  // Create the Light Account client
  try {
    const client = await createLightAccountAlchemyClient({
      apiKey: ALCHEMY_API_KEY,
      chain: alchemyChain,
      signer,
      // Pass the account address to avoid recalculation
      accountAddress: account.address as `0x${string}`,
      gasManagerConfig,
    })

    console.log('[Wallet] Light Account client created successfully')
    console.log('[Wallet] Client account address:', client.account.address)
    console.log('[Wallet] Gas sponsorship active:', gasSponsorshipEnabled)

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


/**
 * Encrypt private key with password
 * Used when wallet is password-protected
 */
export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  return encryptWithPassword(privateKey, password)
}

/**
 * Decrypt private key with password
 * Used when unlocking wallet
 */
export async function decryptPrivateKey(encryptedPrivateKey: string, password: string): Promise<string> {
  return decryptWithPassword(encryptedPrivateKey, password)
}

/**
 * Check if wallet requires password
 */
export async function requiresPassword(): Promise<boolean> {
  return isWalletInitialized()
}

/**
 * Check if wallet is currently locked
 */
export async function isLocked(): Promise<boolean> {
  const initialized = await isWalletInitialized()
  if (!initialized) {
    return false // Not locked if not initialized
  }
  return isWalletLocked()
}
