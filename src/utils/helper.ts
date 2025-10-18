// Helper function to get current network type from selected chain's metadata
import {useUIStore} from "~store/ui-store";
import {supportedChains, chainMetadata} from "~config/chains";

export const getNetworkType = (): 'mainnet' | 'testnet' => {
  const selectedNetwork = useUIStore.getState().selectedNetwork
  const metadata = chainMetadata[selectedNetwork.id]
  return metadata?.isTestnet ? "testnet" : "mainnet"
}

// Helper function to get blockchain name
export const getBlockchainName = (): string => {
  const selectedNetwork = useUIStore.getState().selectedNetwork
  const metadata = chainMetadata[selectedNetwork.id]
  return metadata?.shortName || "Unknown"
}

// Helper function to filter chains by network type
export const getChainsByNetworkType = (networkType: 'mainnet' | 'testnet') => {
  return supportedChains.filter(chain => {
    const metadata = chainMetadata[chain.id]
    return networkType === 'testnet' ? metadata?.isTestnet : !metadata?.isTestnet
  })
}

// Helper function to get default chain for network type
export const getDefaultChainForType = (networkType: 'mainnet' | 'testnet') => {
  const chains = getChainsByNetworkType(networkType)
  return chains[0] // Return first chain of the type
}
