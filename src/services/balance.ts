import { createPublicClient, http, formatEther, formatUnits, type Chain, type Address } from "viem"
import type { AccountBalance, TokenBalance } from "~/types/account"
import { getAlchemyRpcUrl, ALCHEMY_API_KEY } from "~/config/alchemy"

/**
 * Fetch ETH balance for an address
 */
export async function fetchEthBalance(address: Address, chain: Chain): Promise<string> {
  try {
    const client = createPublicClient({
      chain,
      transport: http(getAlchemyRpcUrl(chain))
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
      8453: "base-mainnet"
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

          tokens.push({
            address: token.contractAddress as Address,
            symbol: metadata.symbol,
            name: metadata.name || metadata.symbol,
            balance,
            decimals
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
 * Fetch complete account balance (ETH + tokens)
 */
export async function fetchAccountBalance(
  address: Address,
  chain: Chain
): Promise<AccountBalance> {
  const [eth, tokens] = await Promise.all([
    fetchEthBalance(address, chain),
    fetchTokenBalances(address, chain)
  ])

  return {
    eth,
    tokens
  }
}
