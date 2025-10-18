export const MINIMUM_PASSWORD_LENGTH = 8;
export const NETWORK_TYPE_LIST = ['testnet', 'mainnet'];

// Blockchain symbol mapping
export const blockchainSymbolMapping: Record<number, string> = {
  1: "ETH",     // Ethereum Mainnet
  11155111: "ETH",  // Sepolia Testnet
  137: "MATIC", // Polygon Mainnet
  80001: "MATIC", // Polygon Mumbai (if supported)
  10: "ETH",   // Optimism Mainnet
  420: "ETH",  // Optimism Goerli (if supported)
  42161: "ETH", // Arbitrum One
  421613: "ETH", // Arbitrum Goerli (if supported)
  8453: "ETH",  // Base Mainnet
  84531: "ETH", // Base Goerli (deprecated)
  84532: "ETH", // Base Sepolia
}
