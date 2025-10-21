import { createPublicClient, http, formatEther, formatUnits, type Chain, type Address } from "viem"
import type { AccountBalance, TokenBalance } from "~/types/account"
import { getAlchemyRpcUrl, ALCHEMY_API_KEY, getRpcUrlWithCustomSupport } from "~/config/alchemy"
import { fetchTokenPricesMap, getCoinGeckoId, type TokenPrice } from "./price"
import { getCustomTokensForNetwork } from "./customTokens"

/**
 * Fetch ETH balance for an address
 */
export async function fetchEthBalance(address: Address, chain: Chain): Promise<string> {
  try {
    const client = createPublicClient({
      chain,
      transport: http(getRpcUrlWithCustomSupport(chain))
    })

    const balance = await client.getBalance({ address })
    return formatEther(balance)
  } catch (error) {
    console.error("Error fetching ETH balance:", error)
    return "0"
  }
}

/**
 * Fetch token balances for an address using Alchemy's Token API
 */
export async function fetchTokenBalances(
  address: Address,
  chain: Chain
): Promise<TokenBalance[]> {
  try {
    if (!ALCHEMY_API_KEY) {
      console.warn("Alchemy API key not configured, skipping token balances")
      return []
    }

    // Map chain ID to Alchemy network name
    const networkMap: Record<number, string> = {
      1: "eth-mainnet",
      11155111: "eth-sepolia",
      137: "polygon-mainnet",
      10: "opt-mainnet",
      42161: "arb-mainnet",
      8453: "base-mainnet",
      84532: "base-sepolia" // Add Base Sepolia support
    }

    const network = networkMap[chain.id]
    if (!network) {
      console.warn(`Token balances not supported for chain ${chain.name}`)
      return []
    }

    const response = await fetch(
      `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "alchemy_getTokenBalances",
          params: [address],
          id: 1,
        }),
      }
    )

    const data = await response.json()

    if (data.error) {
      console.error("Alchemy API error:", data.error)
      return []
    }

    // Filter out tokens with zero balance and format
    const tokens: TokenBalance[] = []

    for (const token of data.result.tokenBalances || []) {
      // Skip tokens with zero balance
      if (!token.tokenBalance || token.tokenBalance === "0x0") {
        continue
      }

      try {
        // Fetch token metadata
        const metadataResponse = await fetch(
          `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "alchemy_getTokenMetadata",
              params: [token.contractAddress],
              id: 1,
            }),
          }
        )

        const metadataData = await metadataResponse.json()
        const metadata = metadataData.result

        if (metadata && metadata.symbol) {
          const decimals = metadata.decimals || 18
          const balance = formatUnits(BigInt(token.tokenBalance), decimals)

            // Attempt to get CoinGecko ID for price data
          const coinGeckoId = getCoinGeckoId(metadata.symbol, token.contractAddress)

          tokens.push({
            address: token.contractAddress as Address,
            symbol: metadata.symbol,
            name: metadata.name || metadata.symbol,
            balance,
            decimals,
            usdPrice: undefined,
            usdValue: undefined,
            priceChange24h: undefined,
            coinGeckoId: coinGeckoId || undefined
          })
        }
      } catch (error) {
        console.error(`Error fetching metadata for token ${token.contractAddress}:`, error)
      }
    }

    return tokens
  } catch (error) {
    console.error("Error fetching token balances:", error)
    return []
  }
}

/**
 * Fetch complete account balance (ETH + tokens) with price data
 */
export async function fetchAccountBalance(
  address: Address,
  chain: Chain
): Promise<AccountBalance> {
  const [eth, alchemyTokens] = await Promise.all([
    fetchEthBalance(address, chain),
    fetchTokenBalances(address, chain)
  ])

  // Get custom tokens for this network
  const customTokens = getCustomTokensForNetwork(chain.id)

  // Fetch balances for custom tokens and merge with Alchemy tokens
  const allTokens = await mergeCustomTokensWithBalances(address, chain, alchemyTokens, customTokens)

  // Fetch price data for tokens
  const tokensWithPriceData = await enrichTokensWithPriceData(allTokens)

  return {
    eth,
    tokens: tokensWithPriceData
  }
}

/**
 * Merge custom tokens with their balances and Alchemy-detected tokens
 */
async function mergeCustomTokensWithBalances(
  address: Address,
  chain: Chain,
  alchemyTokens: TokenBalance[],
  customTokens: any[]
): Promise<TokenBalance[]> {
  if (customTokens.length === 0) return alchemyTokens

  // Create a client for fetching balances
  const client = createPublicClient({
    chain,
    transport: http(getAlchemyRpcUrl(chain))
  })

  // ERC-20 balanceOf ABI
  const balanceOfAbi = [
    {
      inputs: [{ name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ] as const

  // Fetch balances for custom tokens
  const customTokenBalances = await Promise.allSettled(
    customTokens.map(async (customToken) => {
      try {
        const balance = await client.readContract({
          address: customToken.address as Address,
          abi: balanceOfAbi,
          functionName: 'balanceOf',
          args: [address]
        })

        const formattedBalance = formatUnits(balance, customToken.decimals)

        // Only include if balance > 0 OR if it's a custom token (show custom tokens even with 0 balance)
        const includeToken = parseFloat(formattedBalance) > 0 || customToken.addedAt > 0

        if (includeToken) {
          return {
            address: customToken.address,
            symbol: customToken.symbol,
            name: customToken.name,
            balance: formattedBalance,
            decimals: customToken.decimals,
            usdPrice: undefined,
            usdValue: undefined,
            priceChange24h: undefined,
            coinGeckoId: getCoinGeckoId(customToken.symbol, customToken.address) || undefined
          } as TokenBalance
        }
      } catch (error) {
        console.warn(`Failed to fetch balance for custom token ${customToken.address}:`, error)

        // Still include custom token even if balance fetch fails
        return {
          address: customToken.address,
          symbol: customToken.symbol,
          name: customToken.name,
          balance: '0',
          decimals: customToken.decimals,
          usdPrice: undefined,
          usdValue: undefined,
          priceChange24h: undefined,
          coinGeckoId: getCoinGeckoId(customToken.symbol, customToken.address) || undefined
        } as TokenBalance
      }
      return null
    })
  )

  // Filter out null results and merge with Alchemy tokens
  const validCustomTokens = customTokenBalances
    .filter((result): result is PromiseSettledResult<TokenBalance> =>
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)

  // Merge and deduplicate by address
  const allTokens = new Map<string, TokenBalance>()

  // Add Alchemy tokens first (they have real balances)
  alchemyTokens.forEach(token => {
    allTokens.set(token.address.toLowerCase(), token)
  })

  // Add custom tokens (they override Alchemy tokens if same address)
  validCustomTokens.forEach(token => {
    allTokens.set(token.address.toLowerCase(), token)
  })

  return Array.from(allTokens.values())
}

/**
 * Enrich token balances with price data from CoinGecko
 */
async function enrichTokensWithPriceData(tokens: TokenBalance[]): Promise<TokenBalance[]> {
  if (tokens.length === 0) return tokens

  // Extract CoinGecko IDs that we know about
  const knownIds: string[] = []
  const tokenMap = new Map<TokenBalance, string>()

  tokens.forEach(token => {
    const coinGeckoId = getCoinGeckoId(token.symbol, token.address)
    if (coinGeckoId) {
      knownIds.push(coinGeckoId)
      tokenMap.set(token, coinGeckoId)
    }
  })

  if (knownIds.length === 0) return tokens

  try {
    // Fetch price data for known tokens
    const priceMap = await fetchTokenPricesMap(knownIds)

    // Enrich tokens with price data
    return tokens.map(token => {
      const coinGeckoId = tokenMap.get(token)
      if (!coinGeckoId) return token

      const priceData = priceMap[coinGeckoId] || priceMap[token.symbol.toLowerCase()]

      if (!priceData || !priceData.current_price) return token

      const usdPrice = priceData.current_price
      const balance = parseFloat(token.balance)
      const usdValue = usdPrice * balance

      return {
        ...token,
        usdPrice: usdPrice,
        usdValue: usdValue,
        priceChange24h: priceData.price_change_percentage_24h || undefined
      }
    })
  } catch (error) {
    console.error('Error fetching price data for tokens:', error)
    return tokens
  }
}
