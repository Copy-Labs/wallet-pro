/**
 * Service for managing connected DApps
 */

import type { ConnectedDApp, DAppSecurity } from '~types/dapp'
import { getStoredAccounts } from '~services/wallet'
import browser from 'webextension-polyfill'

/**
 * Storage key for connected dApps
 */
const CONNECTED_DAPPS_KEY = 'wallet_connected_dapps'

/**
 * Get all connected dApps
 */
export async function getConnectedDApps(): Promise<ConnectedDApp[]> {
  try {
    const result = await browser.storage.local.get(CONNECTED_DAPPS_KEY)
    console.log('Connected DApps:', result);
    return result[CONNECTED_DAPPS_KEY] || []
  } catch (error) {
    console.error('Failed to get connected dApps:', error)
    return []
  }
}

/**
 * Check if an origin is connected
 */
export async function isOriginConnected(origin: string): Promise<boolean> {
  const dApps = await getConnectedDApps()
  return dApps.some(dApp => dApp.origin === origin && dApp.status === 'active')
}

/**
 * Connect a DApp with specific accounts
 */
export async function connectDApp(origin: string, accounts: string[]): Promise<void> {
  try {
    const dApps = await getConnectedDApps()
    const existingIndex = dApps.findIndex(dApp => dApp.origin === origin)

    const displayName = extractDAppName(origin)

    const dApp: ConnectedDApp = {
      origin,
      name: displayName,
      accounts,
      connectedAt: Date.now(),
      lastUsedAt: Date.now(),
      status: 'active'
    }

    if (existingIndex >= 0) {
      // Update existing connection
      dApps[existingIndex] = dApp
    } else {
      // Add new connection
      dApps.push(dApp)
    }

    await browser.storage.local.set({ [CONNECTED_DAPPS_KEY]: dApps })

    // Also set the legacy format for backward compatibility
    await saveConnection(origin, accounts)
  } catch (error) {
    console.error('Failed to connect DApp:', error)
    throw error
  }
}

/**
 * Disconnect a DApp
 */
export async function disconnectDApp(origin: string): Promise<void> {
  try {
    const dApps = await getConnectedDApps()
    const filteredDApps = dApps.filter(dApp => dApp.origin !== origin)

    await browser.storage.local.set({ [CONNECTED_DAPPS_KEY]: filteredDApps })

    // Also remove from legacy storage
    await browser.storage.local.remove(`connected_${origin}`)
  } catch (error) {
    console.error('Failed to disconnect DApp:', error)
    throw error
  }
}

/**
 * Get accounts connected to a specific origin
 */
export async function getConnectedAccounts(origin: string): Promise<string[]> {
  const dApps = await getConnectedDApps()
  const dApp = dApps.find(d => d.origin === origin && d.status === 'active')
  return dApp ? dApp.accounts : []
}

/**
 * Update last used timestamp for a DApp
 */
export async function updateDAppLastUsed(origin: string): Promise<void> {
  try {
    const dApps = await getConnectedDApps()
    const dAppIndex = dApps.findIndex(d => d.origin === origin)

    if (dAppIndex >= 0) {
      dApps[dAppIndex].lastUsedAt = Date.now()
      await browser.storage.local.set({ [CONNECTED_DAPPS_KEY]: dApps })
    }
  } catch (error) {
    console.error('Failed to update DApp last used:', error)
  }
}

/**
 * Get DApp security information
 */
export async function getDAppSecurityInfo(origin: string): Promise<DAppSecurity> {
  // Basic security check - in a real implementation this would check SSL certificates,
  // reputation databases, etc.
  try {
    new URL(origin) // Validate URL format

    let sslCertificate: 'valid' | 'invalid' | 'unknown' = 'unknown'

    // Check if origin starts with https
    if (origin.startsWith('https://')) {
      sslCertificate = 'valid' // Assume valid for HTTPS, real implementation would verify
    } else if (origin.startsWith('http://')) {
      sslCertificate = 'invalid' // HTTP is insecure
    }

    return {
      origin,
      sslCertificate,
      reputation: 50, // Placeholder - could integrate with reputation services
      verified: false // Placeholder - could check verified dApps list
    }
  } catch {
    return {
      origin,
      sslCertificate: 'unknown',
      reputation: 0,
      verified: false
    }
  }
}

/**
 * Extract display name from origin URL
 */
function extractDAppName(origin: string): string {
  try {
    const url = new URL(origin)
    return url.hostname.replace('www.', '')
  } catch {
    return origin
  }
}

/**
 * Legacy compatibility - save to old format
 */
async function saveConnection(origin: string, accounts: string[]): Promise<void> {
  await browser.storage.local.set({
    [`connected_${origin}`]: {
      accounts,
      timestamp: Date.now(),
    },
  })
}

/**
 * Initialize connected dApps from legacy format (migration helper)
 */
export async function migrateLegacyConnections(): Promise<void> {
  try {
    const allStorage = await browser.storage.local.get(null)
    const legacyConnections: any[] = []

    // Find all legacy connection keys
    for (const key of Object.keys(allStorage)) {
      if (key.startsWith('connected_') && key !== 'connected_') {
        const origin = key.replace('connected_', '')
        const data = allStorage[key]

        if (data && data?.accounts) {
          legacyConnections.push({
            origin,
            name: extractDAppName(origin),
            accounts: data.accounts,
            connectedAt: data.timestamp || Date.now(),
            status: 'active'
          })
        }
      }
    }

    if (legacyConnections.length > 0) {
      const existingDApps = await getConnectedDApps()
      const mergedDApps = [...existingDApps]

      // Add legacy connections if they don't exist
      for (const legacy of legacyConnections) {
        const exists = mergedDApps.some(d => d.origin === legacy.origin)
        if (!exists) {
          mergedDApps.push(legacy)
        }
      }

      await browser.storage.local.set({ [CONNECTED_DAPPS_KEY]: mergedDApps })
      console.log(`Migrated ${legacyConnections.length} legacy connections`)
    }
  } catch (error) {
    console.error('Failed to migrate legacy connections:', error)
  }
}
