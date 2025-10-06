import type { PlasmoCSConfig } from "plasmo"
import { EthereumProvider } from "./ethereum-provider"

// Inject the Ethereum provider when the script loads
if (typeof window !== "undefined" && !window.ethereum) {
  const provider = new EthereumProvider()
  window.ethereum = provider
  console.log("Smart Wallet Pro injected ethereum provider")
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    ethereum?: typeof EthereumProvider.prototype
  }
}
