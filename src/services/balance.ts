import { createPublicClient, http, formatEther, type Chain, type Address } from "viem"
import type { AccountBalance, TokenBalance } from "~/types/account"
import { getAlchemyRpcUrl } from "~/config/alchemy"

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
 * Fetch token balances for an address
 * Note: For now returns empty array, will be enhanced with Alchemy API
 */
export async function fetchTokenBalances(
  address: Address,
  chain: Chain
): Promise<TokenBalance[]> {
  try {
    // TODO: Implement using Alchemy's Token API
    // For MVP, we'll focus on ETH balance first
    // Future enhancement: Use Alchemy's getTokenBalances API
    return []
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
