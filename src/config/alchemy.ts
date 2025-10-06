import { createPublicClient, http, type Chain } from "viem"
import { defaultChain } from "./chains"

// Alchemy API Key - should be set from environment or storage
// For development, this will need to be configured
export const ALCHEMY_API_KEY = process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY || ""

// Get Alchemy RPC URL for a chain
export const getAlchemyRpcUrl = (chain: Chain): string => {
  const baseUrl = "https://"

  const networkMap: Record<number, string> = {
    1: "eth-mainnet.g.alchemy.com/v2/",
    11155111: "eth-sepolia.g.alchemy.com/v2/",
    137: "polygon-mainnet.g.alchemy.com/v2/",
    10: "opt-mainnet.g.alchemy.com/v2/",
    42161: "arb-mainnet.g.alchemy.com/v2/",
    8453: "base-mainnet.g.alchemy.com/v2/"
  }

  const network = networkMap[chain.id]
  if (!network) {
    throw new Error(`Unsupported chain: ${chain.name}`)
  }

  return `${baseUrl}${network}${ALCHEMY_API_KEY}`
}

// Create a public client for a specific chain
export const createAlchemyClient = (chain: Chain = defaultChain) => {
  return createPublicClient({
    chain,
    transport: http(getAlchemyRpcUrl(chain))
  })
}
