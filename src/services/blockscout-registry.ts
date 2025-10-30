interface BlockscoutChainInfo {
  chainId: number
  name: string
  explorers: Array<{
    url: string
    hostedBy: string
  }>
}

interface BlockscoutRegistry {
  [chainId: string]: BlockscoutChainInfo
}

/**
 * BlockScout Registry Service - Manages fetching and caching of BlockScout-supported chains
 * Follows the same pattern as useChainList hook for production reliability
 */
class BlockscoutRegistryService {
  private static instance: BlockscoutRegistryService
  private registry: BlockscoutRegistry | null = null
  private lastFetch: number = 0
  private readonly CACHE_DURATION = 1000 * 60 * 60 // 1 hour (same as chainlist)
  private readonly REGISTRY_URL = 'https://raw.githubusercontent.com/blockscout/chainscout/main/data/chains.json'

  static getInstance(): BlockscoutRegistryService {
    if (!BlockscoutRegistryService.instance) {
      BlockscoutRegistryService.instance = new BlockscoutRegistryService()
    }
    return BlockscoutRegistryService.instance
  }

  async getRegistry(): Promise<BlockscoutRegistry> {
    // Use cache if valid
    if (this.registry && (Date.now() - this.lastFetch) < this.CACHE_DURATION) {
      return this.registry
    }

    try {
      console.log('[BlockScout Registry] Fetching latest chain registry...')
      const response = await fetch(this.REGISTRY_URL, {
        headers: {
          'Cache-Control': 'no-cache',
          'User-Agent': 'SmartWalletPro/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`)
      }

      const fullRegistry = await response.json()

      // Include ALL chains from BlockScout registry (they are all supported)
      this.registry = Object.fromEntries(
        Object.entries(fullRegistry)
          .filter(([_, chain]: [string, any]) => {
            // Basic validation: ensure chain has required fields
            return chain.name && chain.explorers && Array.isArray(chain.explorers) && chain.explorers.length > 0
          })
          .map(([chainId, chain]: [string, any]) => {
            return [chainId, {
              chainId: parseInt(chainId),
              name: chain.name,
              explorers: chain.explorers // All explorers, not just blockscout ones
            }]
          })
      )

      this.lastFetch = Date.now()
      console.log(`[BlockScout Registry] ✅ Loaded ${Object.keys(this.registry).length} BlockScout chains`)

      return this.registry

    } catch (error) {
      console.error('[BlockScout Registry] Failed to fetch BlockScout registry:', error)

      // Return cached data if available, even if stale
      if (this.registry) {
        console.log('[BlockScout Registry] Returning stale registry data due to network error')
        return this.registry
      }

      // Ultimate fallback: empty registry
      console.log('[BlockScout Registry] No cached data available, returning empty registry')
      return {}
    }
  }

  getApiUrl(chainId: number): string | null {
    const chain = this.registry?.[chainId.toString()]
    if (!chain) return null

    const explorer = chain.explorers[0]
    if (!explorer) return null

    // Convert explorer URL to API URL
    // https://eth.blockscout.com/ → https://eth.blockscout.com/api/v2
    const baseUrl = explorer.url.replace(/\/$/, '')
    return `${baseUrl}/api/v2`
  }

  isSupported(chainId: number): boolean {
    return !!this.getApiUrl(chainId)
  }

  async preloadRegistry(): Promise<void> {
    // Optional: Preload registry on app start
    try {
      await this.getRegistry()
    } catch (error) {
      // Silent failure during preload
    }
  }
}

// Export singleton instance for easy access
export const blockscoutRegistry = BlockscoutRegistryService.getInstance()

// Convenience functions
export async function getBlockscoutApiUrl(chainId: number): Promise<string | null> {
  const registry = await blockscoutRegistry.getRegistry()
  return blockscoutRegistry.getApiUrl(chainId)
}

export async function isBlockscoutSupported(chainId: number): Promise<boolean> {
  const registry = await blockscoutRegistry.getRegistry()
  return blockscoutRegistry.isSupported(chainId)
}
