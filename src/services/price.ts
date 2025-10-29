/**
 * Service for fetching token prices from CoinGecko and other APIs
 */

export interface TokenPrice {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number | null
  price_change_percentage_24h: number | null
}

/**
 * Cache for price data to avoid excessive API calls
 */
const priceCache: Map<string, { data: TokenPrice[]; timestamp: number }> = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch prices for multiple tokens from CoinGecko
 */
export async function fetchTokensPrices(tokenIds: string[]): Promise<TokenPrice[]> {
  // If we have cached data that's still valid, use it
  const cacheKey = tokenIds.sort().join(',')
  const cached = priceCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // CoinGecko allows up to 30 tokens per request for free tier
    const ids = tokenIds.slice(0, 30).join(',')
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?ids=${ids}&vs_currencies=usd&price_change_percentage_24h=true&per_page=30&page=1`
    )

    if (!response.ok) {
      console.warn('CoinGecko API error:', response.status)
      return []
    }

    const data = await response.json()

    // Cache the result
    priceCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

    return data
  } catch (error) {
    console.error('Error fetching token prices:', error)
    return []
  }
}

/**
 * Fetch price for a single token by ID
 */
export async function fetchTokenPrice(tokenId: string): Promise<TokenPrice | null> {
  const prices = await fetchTokensPrices([tokenId])
  return prices.length > 0 ? prices[0] : null
}

/**
 * Fetch all prices and return a map of symbol to price data
 */
export async function fetchTokenPricesMap(tokenIds: string[]): Promise<Record<string, TokenPrice>> {
  const prices = await fetchTokensPrices(tokenIds)

  const priceMap: Record<string, TokenPrice> = {}
  prices.forEach(price => {
    // Use both id and symbol as keys for easier lookup
    priceMap[price.id] = price
    priceMap[price.symbol.toLowerCase()] = price
  })

  return priceMap
}

/**
 * Clear the price cache (useful for manual refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear()
}

/**
 * Common token ID mappings for popular tokens
 * These should map contract addresses/symbols to CoinGecko IDs where possible
 */
export const COMMON_TOKEN_MAPPING: Record<string, string> = {
  // Ethereum mainnet popular tokens
  // '0xa0b86a33e6c9dcd66ac0f6f7be8126b2afe42408': 'uniswap',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uniswap',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'dai',
  '0xa0b86a33e6c9dcd66ac0f6f7be8126b2afe42408': 'usd-coin',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth',
  '0xb8c77482e45f1f44de1745f52c74426c631bdd52': 'chainlink',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'chainlink',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin',
  '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': 'yearn-finance',
  // Polygon tokens
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin',
  '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'usd-coin',
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'dai',
  '0x53e0bca35ec356bd5dddfebbd1fc0fd03fab9557': 'chainlink',
  // Other networks can be added here as needed
}

/**
 * Convert a token symbol/contract to CoinGecko ID
 * This is a best-effort mapping - not all tokens will be available
 */
export function getCoinGeckoId(tokenSymbol: string, contractAddress?: string): string | null {
  // Try direct symbol mapping first (for well-known tokens)
  const directMapping = COMMON_TOKEN_MAPPING[contractAddress?.toLowerCase() || '']
  if (directMapping) return directMapping

  // For common symbols, try the symbol directly
  const commonSymbols = ['dai', 'usdc', 'usdt', 'weth', 'wbtc', 'matic', 'aave', 'link', 'uni', 'susd', 'busd']
  if (commonSymbols.includes(tokenSymbol.toLowerCase())) {
    return tokenSymbol.toLowerCase()
  }

  // For wrapped tokens
  if (tokenSymbol.toLowerCase().startsWith('w')) {
    const baseSymbol = tokenSymbol.toLowerCase().slice(1)
    if (['eth', 'btc'].includes(baseSymbol)) {
      return `wrapped-${baseSymbol}`
    }
  }

  // Not found - return null
  return null
}
