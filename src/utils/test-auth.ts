/**
 * Authentication System Tests
 *
 * Basic tests to verify the social authentication system works correctly.
 */

import { signInWithProvider, getCurrentUser, signOut, initAuthClient } from "~services/auth"
import { createSmartAccountForUser, getAccountForUser } from "~services/wallet"

export async function testAuthSystem() {
  console.log("🧪 Testing Smart Wallet Pro Authentication System")

  try {
    // Test 1: Initialize auth client
    console.log("1️⃣ Testing auth client initialization...")
    await initAuthClient()
    console.log("✅ Auth client initialized")

    // Test 2: Sign in with demo provider
    console.log("2️⃣ Testing sign in with Google...")
    const user = await signInWithProvider("google")
    console.log("✅ Signed in as:", user.email || user.userId)

    // Test 3: Get current user
    console.log("3️⃣ Testing get current user...")
    const currentUser = await getCurrentUser()
    if (currentUser?.userId === user.userId) {
      console.log("✅ Current user matches signed in user")
    } else {
      throw new Error("Current user doesn't match")
    }

    // Test 4: Create account for user
    console.log("4️⃣ Testing account creation for authenticated user...")
    const account = await createSmartAccountForUser(user, "Test Auth Account")
    console.log("✅ Account created:", account.address)

    // Test 5: Retrieve account for user
    console.log("5️⃣ Testing account retrieval...")
    const retrievedAccount = await getAccountForUser(user.userId)
    if (retrievedAccount?.id === account.id) {
      console.log("✅ Account retrieved successfully")
    } else {
      throw new Error("Account retrieval failed")
    }

    // Test 6: Sign out
    console.log("6️⃣ Testing sign out...")
    await signOut()
    const afterSignOut = await getCurrentUser()
    if (!afterSignOut) {
      console.log("✅ Signed out successfully")
    } else {
      throw new Error("Sign out failed")
    }

    console.log("🎉 All authentication tests passed!")
    return true

  } catch (error) {
    console.error("❌ Authentication test failed:", error)
    return false
  }
}

// Helper function to run tests in browser console
export function runAuthTests() {
  testAuthSystem().then(success => {
    if (success) {
      console.log("🎊 Authentication system is working correctly!")
    } else {
      console.error("💥 Authentication system has issues")
    }
  })
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testAuth = runAuthTests
}
