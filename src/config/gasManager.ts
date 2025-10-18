/**
 * Alchemy Gas Manager Configuration
 * Enables gasless transactions for users
 */

// Environment fallback for policy ID
export const DEFAULT_GAS_MANAGER_POLICY_ID = process.env.PLASMO_PUBLIC_ALCHEMY_POLICY_ID || ""

// User-facing gas sponsorship settings
export interface GasSponsorshipSettings {
  enabled: boolean
  thresholdUSD: number // Maximum USD cost for sponsorship
  policyId: string
}

/**
 * Default gas sponsorship settings
 */
export const DEFAULT_GAS_SPONSORSHIP_SETTINGS: GasSponsorshipSettings = {
  enabled: !!DEFAULT_GAS_MANAGER_POLICY_ID,
  thresholdUSD: 1.0, // $1 max
  policyId: DEFAULT_GAS_MANAGER_POLICY_ID
}

let cachedSettings: GasSponsorshipSettings | null = null

/**
 * Get current gas sponsorship settings from storage
 */
export async function getGasSponsorshipSettings(): Promise<GasSponsorshipSettings> {
  if (cachedSettings) return cachedSettings

  try {
    const { storage } = await import("@plasmohq/storage")
    const saved = await storage.get<GasSponsorshipSettings>("gasSponsorshipSettings")
    if (saved) {
      cachedSettings = saved
      return saved
    }
  } catch (error) {
    console.error('[GasManager] Error loading settings:', error)
  }

  // Fall back to defaults
  cachedSettings = { ...DEFAULT_GAS_SPONSORSHIP_SETTINGS }
  return cachedSettings
}

/**
 * Save gas sponsorship settings to storage
 */
export async function saveGasSponsorshipSettings(settings: Partial<GasSponsorshipSettings>): Promise<void> {
  try {
    const current = await getGasSponsorshipSettings()
    const updated: GasSponsorshipSettings = { ...current, ...settings }

    const { Storage } = await import("@plasmohq/storage")
    const storage = new Storage();
    await storage.set("gasSponsorshipSettings", updated)

    cachedSettings = updated
    console.log('[GasManager] Settings saved:', updated)
  } catch (error) {
    console.error('[GasManager] Error saving settings:', error)
    throw error
  }
}

/**
 * Clear cached settings (for testing)
 */
export function clearSettingsCache(): void {
  cachedSettings = null
}

/**
 * Check if gas sponsorship is enabled
 */
export async function isGasSponsorshipEnabled(): Promise<boolean> {
  const settings = await getGasSponsorshipSettings()
  return settings.enabled && !!settings.policyId
}

/**
 * Get gas manager configuration for Alchemy AA client
 */
export async function getGasManagerConfig() {
  const settings = await getGasSponsorshipSettings()

  if (!settings.enabled || !settings.policyId) {
    return undefined
  }

  return {
    policyId: settings.policyId,
  }
}

/**
 * Check if a transaction cost is eligible for sponsorship based on current settings
 */
export async function checkGasSponsorshipEligibility(estimatedCostUSD: string): Promise<{
  canSponsor: boolean
  reason?: string
  maxThreshold: number
}> {
  const settings = await getGasSponsorshipSettings()

  if (!settings.enabled) {
    return {
      canSponsor: false,
      reason: 'Gas sponsorship is disabled',
      maxThreshold: settings.thresholdUSD
    }
  }

  const costUSD = parseFloat(estimatedCostUSD)
  const canSponsor = costUSD <= settings.thresholdUSD

  return {
    canSponsor,
    reason: canSponsor ? undefined : `Cost $${estimatedCostUSD} exceeds sponsorship threshold of $${settings.thresholdUSD}`,
    maxThreshold: settings.thresholdUSD
  }
}
