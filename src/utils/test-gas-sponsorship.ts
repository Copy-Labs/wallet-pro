/**
 * Gas Sponsorship Testing Utility
 * Verify that Alchemy Gas Manager is working correctly
 */

import { getActiveAccount, getAccountClient } from "~/services/wallet"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import { isGasSponsorshipEnabled, GAS_MANAGER_POLICY_ID } from "~/config/gasManager"
import { ALCHEMY_API_KEY } from "~/config/alchemy"
import { parseEther, type Address } from "viem"

export interface GasSponsorshipTestResult {
  success: boolean
  message: string
  details: {
    apiKeyConfigured: boolean
    policyIdConfigured: boolean
    gasSponsorshipEnabled: boolean
    accountAddress?: string
    chainId?: number
    chainName?: string
    clientCreated?: boolean
    error?: string
  }
}

/**
 * Test gas sponsorship configuration
 */
export async function testGasSponsorshipConfig(): Promise<GasSponsorshipTestResult> {
  const details: GasSponsorshipTestResult['details'] = {
    apiKeyConfigured: !!ALCHEMY_API_KEY,
    policyIdConfigured: !!GAS_MANAGER_POLICY_ID,
    gasSponsorshipEnabled: isGasSponsorshipEnabled()
  }

  // Check API key
  if (!ALCHEMY_API_KEY) {
    return {
      success: false,
      message: "❌ Alchemy API key not configured",
      details
    }
  }

  // Check Policy ID
  if (!GAS_MANAGER_POLICY_ID) {
    return {
      success: false,
      message: "⚠️ Gas Manager Policy ID not configured - transactions will require gas fees",
      details
    }
  }

  // Check if gas sponsorship is enabled
  if (!isGasSponsorshipEnabled()) {
    return {
      success: false,
      message: "❌ Gas sponsorship is not enabled",
      details
    }
  }

  return {
    success: true,
    message: "✅ Gas sponsorship is configured correctly",
    details
  }
}

/**
 * Test creating a client with gas sponsorship
 */
export async function testGasSponsorshipClient(): Promise<GasSponsorshipTestResult> {
  const configTest = await testGasSponsorshipConfig()
  
  if (!configTest.success) {
    return configTest
  }

  try {
    // Get active account
    const account = await getActiveAccount()
    if (!account) {
      return {
        success: false,
        message: "❌ No active account found",
        details: {
          ...configTest.details,
          error: "No active account"
        }
      }
    }

    // Get current chain
    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain

    // Try to create client with gas sponsorship
    const client = await getAccountClient(account.id, chain)

    return {
      success: true,
      message: "✅ Gas-sponsored client created successfully",
      details: {
        ...configTest.details,
        accountAddress: account.address,
        chainId: chain.id,
        chainName: chain.name,
        clientCreated: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to create gas-sponsored client: ${error.message}`,
      details: {
        ...configTest.details,
        clientCreated: false,
        error: error.message
      }
    }
  }
}

/**
 * Estimate gas for a test transaction
 */
export async function testGasEstimation(
  recipientAddress: Address,
  amount: string = "0.001"
): Promise<GasSponsorshipTestResult> {
  const clientTest = await testGasSponsorshipClient()
  
  if (!clientTest.success) {
    return clientTest
  }

  try {
    const account = await getActiveAccount()
    if (!account) {
      throw new Error("No active account")
    }

    const chainId = await getSelectedNetwork()
    const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain
    const client = await getAccountClient(account.id, chain)

    // Estimate gas for a small ETH transfer
    const gasEstimate = await client.estimateGas({
      to: recipientAddress,
      value: parseEther(amount)
    })

    return {
      success: true,
      message: `✅ Gas estimation successful: ${gasEstimate.toString()} gas units`,
      details: {
        ...clientTest.details,
        accountAddress: account.address,
        chainId: chain.id,
        chainName: chain.name
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Gas estimation failed: ${error.message}`,
      details: {
        ...clientTest.details,
        error: error.message
      }
    }
  }
}

/**
 * Run all gas sponsorship tests
 */
export async function runAllGasSponsorshipTests(): Promise<{
  configTest: GasSponsorshipTestResult
  clientTest: GasSponsorshipTestResult
  summary: string
}> {
  console.log("🧪 Running Gas Sponsorship Tests...")
  
  const configTest = await testGasSponsorshipConfig()
  console.log("1. Configuration Test:", configTest.message)
  console.log("   Details:", configTest.details)

  const clientTest = await testGasSponsorshipClient()
  console.log("2. Client Creation Test:", clientTest.message)
  console.log("   Details:", clientTest.details)

  const allPassed = configTest.success && clientTest.success
  const summary = allPassed
    ? "✅ All gas sponsorship tests passed! Your wallet is ready for gasless transactions."
    : "❌ Some tests failed. Check the details above."

  console.log("\n" + summary)

  return {
    configTest,
    clientTest,
    summary
  }
}

/**
 * Get gas sponsorship status for display
 */
export function getGasSponsorshipStatus(): {
  enabled: boolean
  status: "active" | "inactive" | "not-configured"
  message: string
  icon: string
} {
  const hasApiKey = !!ALCHEMY_API_KEY
  const hasPolicyId = !!GAS_MANAGER_POLICY_ID
  const isEnabled = isGasSponsorshipEnabled()

  if (!hasApiKey) {
    return {
      enabled: false,
      status: "not-configured",
      message: "API key not configured",
      icon: "❌"
    }
  }

  if (!hasPolicyId) {
    return {
      enabled: false,
      status: "inactive",
      message: "Gas fees required",
      icon: "⚠️"
    }
  }

  if (isEnabled) {
    return {
      enabled: true,
      status: "active",
      message: "Gasless transactions enabled",
      icon: "✅"
    }
  }

  return {
    enabled: false,
    status: "not-configured",
    message: "Configuration error",
    icon: "❌"
  }
}

