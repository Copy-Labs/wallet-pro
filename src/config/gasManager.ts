/**
 * Alchemy Gas Manager Configuration
 * Enables gasless transactions for users
 */

export const GAS_MANAGER_POLICY_ID = process.env.PLASMO_PUBLIC_ALCHEMY_POLICY_ID || ""

/**
 * Check if gas sponsorship is enabled
 */
export function isGasSponsorshipEnabled(): boolean {
  return !!GAS_MANAGER_POLICY_ID
}

/**
 * Get gas manager configuration for Alchemy AA client
 */
export function getGasManagerConfig() {
  if (!isGasSponsorshipEnabled()) {
    return undefined
  }

  return {
    policyId: GAS_MANAGER_POLICY_ID,
  }
}

