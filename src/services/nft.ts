import type { NFTBalance } from "~/types/account"
import type {Address, Chain} from "viem"
import {ALCHEMY_API_KEY} from "~/config/alchemy"
import {getNetworkByChainId, networkConfigToChain} from "~utils/helper";

// Map chain IDs to Alchemy network names for NFT API
const getAlchemyNetworkName = (chainId: number): string => {
  const networkMap: Record<number, string> = {
    1: "eth-mainnet",
    11155111: "eth-sepolia",
    137: "polygon-mainnet",
    10: "opt-mainnet",
    42161: "arb-mainnet",
    8453: "base-mainnet",
    84532: "base-sepolia"
  }

  return networkMap[chainId] || "eth-mainnet"
}

/**
 * Fetch NFTs for a given owner address using Alchemy's NFT API
 */
export async function fetchNFTsForOwner(
  address: Address,
  chain: Chain
): Promise<NFTBalance[]> {
  try {
    if (!ALCHEMY_API_KEY) {
      console.warn("Alchemy API key not configured, skipping NFT fetch")
      return []
    }

    const network = getAlchemyNetworkName(chain.id)

    const response = await fetch(
      `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&pageSize=20`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      console.error("Alchemy API error:", data.error)
      return []
    }

    // Transform Alchemy response to our NFTBalance format
    return (data.ownedNfts || []).slice(0, 20).map((nft: any): NFTBalance => ({
      contractAddress: nft.contract.address,
      tokenId: nft.tokenId,
      name: nft.name || nft.contract?.name || `NFT #${nft.tokenId}`,
      description: nft.description,
      image: nft.image?.originalUrl || nft.image?.thumbnailUrl,
      attributes: nft.raw?.metadata?.attributes || [],
      collection: {
        name: nft.contract?.name,
        floorPrice: undefined, // Could be fetched separately if needed
      },
      tokenType: nft.tokenType,
      balance: nft.balance?.toString(),
    }))
  } catch (error) {
    console.error("Error fetching NFTs:", error)
    return []
  }
}

/**
 * Fetch NFT metadata for a specific contract and token ID
 */
export async function fetchNFTMetadata(
  contractAddress: Address,
  tokenId: string,
  chain: Chain
): Promise<NFTBalance | null> {
  try {
    if (!ALCHEMY_API_KEY) {
      console.warn("Alchemy API key not configured")
      return null
    }

    const network = getAlchemyNetworkName(chain.id)

    const response = await fetch(
      `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`)
    }

    const nft = await response.json()

    if (nft.error) {
      console.error("Alchemy API error:", nft.error)
      return null
    }

    return {
      contractAddress: nft.contract?.address,
      tokenId: nft.tokenId,
      name: nft.name || nft.contract?.name || `NFT #${nft.tokenId}`,
      description: nft.description,
      image: nft.image?.originalUrl || nft.image?.thumbnailUrl,
      attributes: nft.raw?.metadata?.attributes || [],
      collection: {
        name: nft.contract?.name,
        floorPrice: undefined,
      },
      tokenType: nft.tokenType,
      balance: nft.balance?.toString(),
    }
  } catch (error) {
    console.error("Error fetching NFT metadata:", error)
    return null
  }
}

/**
 * Get floor price for an NFT collection
 */
export async function fetchCollectionFloorPrice(
  contractAddress: Address,
  chain: Chain
): Promise<number | null> {
  try {
    if (!ALCHEMY_API_KEY) return null

    const network = getAlchemyNetworkName(chain.id)

    const response = await fetch(
      `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getFloorPrice?contractAddress=${contractAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      console.error("Alchemy API error:", data.error)
      return null
    }

    // Return floor price in ETH
    return data.openSea?.floorPrice || null
  } catch (error) {
    console.error("Error fetching floor price:", error)
    return null
  }
}
