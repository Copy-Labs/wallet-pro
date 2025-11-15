import { Storage } from "@plasmohq/storage"
import {getSelectedNetwork} from "~utils/storage";
import {createAlchemyClient} from "~config/alchemy";
import {getChainById} from "~config/chains";
import { useSignerStatus } from "@account-kit/react"
import { AlchemySignerStatus } from "@account-kit/signer"

/**
 * Auth integration for Smart Wallet Pro using Alchemy Account Kit.
 *
 * This service provides email and social authentication for wallet creation,
 * enabling the "Just email + social login" experience without seed phrases.
 */

export interface AuthUser {
  userId: string
  email?: string
  provider: string
  sessionToken: string
  expiresAt: number
}

const AUTH_USER_KEY = "smart-wallet-pro/auth-user"

let cachedUser: AuthUser | null = null
let isInitialized = false
let alchemyClient: any = null

// Simple subscribers for auth state changes
type AuthListener = (user: AuthUser | null) => void
const listeners = new Set<AuthListener>()

/**
 * Initialize Alchemy Account Kit auth client.
 */
export async function initAuthClient(): Promise<void> {
  if (isInitialized) return

  try {
    // Get configuration from environment
    const apiKey = process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY
    const appId = process.env.ALCHEMY_APP_ID

    if (!apiKey) {
      console.warn("[Auth] PLASMO_PUBLIC_ALCHEMY_API_KEY not set")
    }

    if (!appId) {
      console.warn("[Auth] ALCHEMY_APP_ID not set - social login disabled")
    }

    // Create Alchemy client for auth operations
    if (apiKey) {
      // alchemyClient = createAlchemyClient({
      //   apiKey,
      //   // Additional auth configuration can be added here
      // })
      const selectedChainId = await getSelectedNetwork()
      const chain = getChainById(selectedChainId)
      alchemyClient = createAlchemyClient(chain)
    }

    // Hydrate cached user from storage if present
    const storage = new Storage()
    const stored = await storage.get<AuthUser>(AUTH_USER_KEY)
    if (stored && stored.expiresAt && stored.expiresAt > Date.now()) {
      cachedUser = stored
    } else {
      cachedUser = null
      if (stored) {
        await storage.remove(AUTH_USER_KEY)
      }
    }

    isInitialized = true
    console.log("[Auth] Account Kit auth client initialized")
  } catch (error) {
    console.error("[Auth] Failed to initialize auth client:", error)
    // Continue with basic functionality even if auth client fails
    isInitialized = true
  }
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(listener: AuthListener): () => void {
  listeners.add(listener)
  // Immediately call with current user so UI can sync
  listener(cachedUser)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Get the current authenticated user (if any).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isInitialized) {
    await initAuthClient()
  }
  return cachedUser
}

/**
 * Internal helper to update auth state and notify subscribers.
 */
async function setAuthUser(user: AuthUser | null): Promise<void> {
  const storage = new Storage()

  cachedUser = user

  if (user) {
    await storage.set(AUTH_USER_KEY, user)
  } else {
    await storage.remove(AUTH_USER_KEY)
  }

  for (const fn of listeners) {
    try {
      fn(user)
    } catch (err) {
      console.error("[Auth] Listener error:", err)
    }
  }
}

/**
 * Create an AuthUser from Account Kit user data.
 * This is called after successful authentication via Account Kit hooks.
 */
export async function createAuthUserFromAccountKit(
  accountKitUser: any,
  provider: "email" | "google" | "github" | "apple" = "email"
): Promise<AuthUser> {
  if (!isInitialized) {
    await initAuthClient()
  }

  const authUser: AuthUser = {
    userId: accountKitUser.id || accountKitUser.userId || `user-${Date.now()}`,
    email: accountKitUser.email,
    provider,
    sessionToken: `ak-token-${Date.now()}`, // Account Kit manages its own session
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  }

  await setAuthUser(authUser)
  console.log("[Auth] Created auth user from Account Kit:", authUser.userId)
  return authUser
}

/**
 * Check if user is authenticated via Account Kit.
 * This should be used in components that need to check auth status.
 */
export function useIsAuthenticated(): boolean {
  // This is a React hook that should be used in components
  // For now, we'll return a simple check
  return cachedUser !== null && cachedUser.expiresAt > Date.now()
}

/**
 * Legacy function for backward compatibility.
 * Now throws an error directing to use Account Kit hooks directly.
 */
export async function signInWithProvider(
  provider: "email" | "google" | "github" | "apple"
): Promise<AuthUser> {
  throw new Error(
    "signInWithProvider is deprecated. Use Account Kit hooks (useAuthenticate) directly in components. " +
    "See EmailOtpAuth component for example implementation."
  )
}

/**
 * Complete an OAuth / redirect-based sign-in flow.
 *
 * Use this from your oauth-signin.html / redirect handler tab to:
 * - Read tokens/user info from URL or SDK.
 * - Normalize into AuthUser.
 */
export async function completeRedirectSignIn(
  payload: {
    userId: string
    email?: string
    provider: string
    sessionToken: string
    expiresAt: number
  }
): Promise<AuthUser> {
  if (!isInitialized) {
    await initAuthClient()
  }

  const authUser: AuthUser = {
    userId: payload.userId,
    email: payload.email,
    provider: payload.provider,
    sessionToken: payload.sessionToken,
    expiresAt: payload.expiresAt
  }

  await setAuthUser(authUser)
  return authUser
}

/**
 * Sign out from the extension perspective.
 * Also call the underlying Alchemy auth client's signOut if available.
 */
export async function signOut(): Promise<void> {
  if (!isInitialized) {
    await initAuthClient()
  }

  // TODO: Call Account Kit signOut if required:
  // await authClient.signOut()

  await setAuthUser(null)
}

/**
 * Utility: ensure there is a valid AuthUser; if not, throw.
 * Use this in critical MPC/AA flows that require an authenticated identity.
 */
export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || user.expiresAt <= Date.now()) {
    throw new Error("Authentication required. Please sign in again.")
  }
  return user
}
