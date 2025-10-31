import { LocalAccountSigner } from "@aa-sdk/core";
import { createSmartWalletClient } from "@account-kit/wallet-client"
import {
  alchemy, defineAlchemyChain,
  arbitrum as akArbitrum,
  arbitrumGoerli as akArbitrumGoerli,
  arbitrumNova as akarbitrumNova,
  arbitrumSepolia as akArbitrumSepolia,
  base as akBase,
  baseSepolia as akBaseSepolia,
  baseGoerli as akBaseGoerli,
  beraChainBartio as akBeraChainBartio,
  bobaMainnet as akBobaMainnet,
  bobaSepolia as akbobaSepolia,
  celoAlfajores as akCeloAlfajores,
  celoMainnet as akCeloMainnet,
  fraxtal as akFraxtal,
  fraxtalSepolia as akFraxtalSepolia,
  goerli as akGoerli,
  gensynTestnet as akGensysTestnet,
  inkMainnet as akInkMainnet,
  inkSepolia as akInkSepolia,
  mainnet as akMainnet,
  mekong as akMekong,
  monadTestnet as akMonadTestnet,
  optimism as akOptimism,
  optimismSepolia as akOptimismSepolia,
  optimismGoerli as akOptimismGoerli,
  opbnbMainnet as akOpbnbMainnet,
  opbnbTestnet as akOpbnbTestnet,
  openlootSepolia as akOpenlootSepolia,
  polygon as akPolygon,
  polygonAmoy as akPolygonAmoy,
  polygonMumbai as akPolygonMumbai,
  riseTestnet as akRiseTestnet,
  sepolia as akSepolia,
  shape as akShape,
  shapeSepolia as akShapeSepolia,
  soneiumMainnet as akSoneiumMainnet,
  soneiumMinato as akSoneiumMinato,
  storyAeneid as akStoryAeneid,
  storyMainnet as akStoryMainnet,
  teaSepolia as akTeaSepolia,
  unichainMainnet as akUnichainMainnet,
  unichainSepolia as akUnichainSepolia,
  worldChain as akWorldChain,
  worldChainSepolia as akWorldChainSepolia,
  zora as akZora,
  zoraSepolia as akZoraSepolia,
} from "@account-kit/infra"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { Chain, Address, Hex } from "viem"
import type { WalletAccount } from "~/types/account"
import { getStoredAccounts, saveAccounts, setActiveAccountId } from "~/utils/storage"
import {ALCHEMY_API_KEY, getAlchemyRpcUrl} from "~/config/alchemy"
import { getGasManagerConfig, isGasSponsorshipEnabled } from "~/config/gasManager"
import { encryptWithPassword, decryptWithPassword } from "./encryption"
import { isWalletInitialized, isWalletLocked } from "./security"
import { getChainById } from "~/config/chains"

// Map viem chain IDs to Account Kit chains (only chains available in @account-kit/infra)
const ACCOUNT_KIT_CHAIN_MAP: Record<number, any> = {
  [akSepolia.id]: akSepolia,
  [akMainnet.id]: akMainnet,
  [akPolygon.id]: akPolygon,
  [akOptimism.id]: akOptimism,
  [akArbitrum.id]: akArbitrum,
  [akArbitrumSepolia.id]: akArbitrumSepolia,
  [akArbitrumGoerli.id]: akArbitrumGoerli,
  [akarbitrumNova.id]: akarbitrumNova,
  [akBase.id]: akBase,
  [akPolygonAmoy.id]: akPolygonAmoy,
  [akOptimismSepolia.id]: akOptimismSepolia,
  [akInkMainnet.id]: akInkMainnet,
  [akInkSepolia.id]: akInkSepolia,
  [akSoneiumMainnet.id]: akSoneiumMainnet,
  [akSoneiumMinato.id]: akSoneiumMinato,
}

/**
 * Get Account Kit compatible chain for chain ID
 * Only returns chains that actually support Alchemy AA
 * Throws error for unsupported chains (they should use regular RPC fallback)
 */
function getAccountKitChain(chainId: number) {
  // Use pre-configured chain if available (guaranteed to work with AA)
  if (ACCOUNT_KIT_CHAIN_MAP[chainId]) {
    return ACCOUNT_KIT_CHAIN_MAP[chainId]
  }

  // For unsupported chains, throw error to trigger fallback to regular RPC
  throw new Error(`Chain ${chainId} is not supported by Account Kit. Use regular RPC transaction fallbacks.`)
}

// Chain compatibility cache to avoid repeated network checks
const _chainCompatibilityCache = new Map<number, boolean>()

/**
 * Check if a chain supports Account Kit (EIP-7702) smart wallet features
 */
export async function isChainAccountKitCompatible(chainId: number): Promise<boolean> {
  // Fast registry check first
  if (ACCOUNT_KIT_CHAIN_MAP[chainId]) {
    console.log(`[Chain Compatibility] Chain ${chainId} is in registry - supported`)
    return true
  }

  // Check cache to avoid repeated network calls
  if (_chainCompatibilityCache.has(chainId)) {
    const cached = _chainCompatibilityCache.get(chainId)
    console.log(`[Chain Compatibility] Chain ${chainId} cache hit: ${cached}`)
    return cached!
  }

  console.log(`[Chain Compatibility] Chain ${chainId} not in cache - testing compatibility...`)

  // Test actual RPC support for wallet methods
  let isCompatible = false

  try {
    const viemChain = getChainById(chainId)
    if (!viemChain) {
      console.log(`[Chain Compatibility] Chain ${chainId} not found in viem chains`)
      _chainCompatibilityCache.set(chainId, false)
      return false
    }

    // Create a public client to test capabilities
    const { createPublicClient } = await import('viem')
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: alchemy({ apiKey: ALCHEMY_API_KEY })
    })

    // Test if the RPC supports the wallet_prepareCalls method
    // This is synchronous and safe - just tests if the method exists
    try {
      await publicClient.request({
        method: "wallet_prepareCalls",
        params: [{
          capabilities: { eip7702Auth: true },
          calls: []
        }]
      })
      isCompatible = true
      console.log(`[Chain Compatibility] Chain ${chainId} supports wallet_prepareCalls - compatible`)
    } catch (rpcError: any) {
      // Check if it's a method not supported error vs other issues
      if (rpcError?.message?.includes('Method not found') ||
          rpcError?.message?.includes('not supported') ||
          rpcError?.code === -32601) {
        console.log(`[Chain Compatibility] Chain ${chainId} does not support wallet_prepareCalls`)
        isCompatible = false
      } else {
        // Other error (network, auth, etc) - treat as unsupported for safety
        console.warn(`[Chain Compatibility] Chain ${chainId} RPC error (treating as unsupported):`, rpcError.message)
        isCompatible = false
      }
    }
  } catch (error: any) {
    console.error(`[Chain Compatibility] Error checking chain ${chainId}:`, error.message)
    isCompatible = false
  }

  // Cache the result
  _chainCompatibilityCache.set(chainId, isCompatible)
  console.log(`[Chain Compatibility] Chain ${chainId} compatibility: ${isCompatible}`)

  return isCompatible
}

/**
 * Clear the chain compatibility cache (useful for testing)
 */
export function clearChainCompatibilityCache(): void {
  _chainCompatibilityCache.clear()
  console.log('[Chain Compatibility] Cache cleared')
}

/**
 * Create a new Smart Account using EIP-7702 delegation
 * @param name - Account name
 * @returns The created wallet account
 */
export async function createSmartAccount(name: string): Promise<WalletAccount> {
  try {
    // Generate new private key and derive EOA address
    const privateKey = generatePrivateKey()
    const eoaAccount = privateKeyToAccount(privateKey)

    console.log('[Wallet] Creating EIP-7702 account with EOA address:', eoaAccount.address)

    // Validate API key
    if (!ALCHEMY_API_KEY) {
      throw new Error("Alchemy API key not configured. Please set PLASMO_PUBLIC_ALCHEMY_API_KEY in your environment.")
    }

    // Create the wallet account object
    // With EIP-7702, the smart account address IS the EOA address
    const account: WalletAccount = {
      id: `account_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      address: eoaAccount.address, // ← EOA becomes smart account address!
      privateKey, // Will be encrypted in production
      createdAt: Date.now(),
      lastUsed: Date.now()
    }

    console.log('[Wallet] EIP-7702 account created:', {
      id: account.id,
      eoaAddress: account.address
    })

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
    console.error("Error creating EIP-7702 account:", error)
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
 * Get a Smart Wallet client for a specific account using EIP-7702
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

  console.log('[Wallet] Creating EIP-7702 Smart Wallet client:', {
    accountId,
    chainId: chain.id,
    chainName: chain.name,
    eoaAddress: account.address
  })

  // Get gas manager configuration for EIP-7702
  const gasManagerConfig = await getGasManagerConfig()

  console.log('[Wallet] Gas sponsorship config:', {
    hasPolicyId: !!gasManagerConfig?.policyId
  })

  // Get the Account Kit compatible chain
  const accountKitChain = getAccountKitChain(chain.id)

  console.log('[Wallet] Using Account Kit chain:', {
    chainId: accountKitChain.id,
    chainName: accountKitChain.name
  })

  // Create the EIP-7702 Smart Wallet client
  try {
    const client = createSmartWalletClient({
      transport: alchemy({ apiKey: ALCHEMY_API_KEY }),
      chain: accountKitChain, // ← Use Account Kit chain!
      signer,
      // The account is the EOA address (it will be delegated via EIP-7702)
      account: account.address,
      policyId: gasManagerConfig?.policyId,
    })

    console.log('[Wallet] EIP-7702 Smart Wallet client created successfully')
    console.log('[Wallet] Account address (EOA delegated):', account.address)

    return client
  } catch (error) {
    console.error('[Wallet] Error creating EIP-7702 client:', error)
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
