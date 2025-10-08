/**
 * Page Provider Entry Point
 *
 * NOTE: This file is now deprecated in favor of src/contents/inpage.ts
 * which uses Plasmo's MAIN world injection.
 *
 * This file is kept for reference and can be removed once migration is complete.
 *
 * For Plasmo projects, use src/contents/inpage.ts instead.
 */

import { EthereumProvider } from './EthereumProvider'
import { CommunicationBridge } from './communication'
import { setupEIP6963, DEFAULT_WALLET_ICON } from './eip6963'

console.warn('[DEPRECATED] This page-provider/index.ts is deprecated. Use contents/inpage.ts instead.')

// Export types and classes for use in other files
export { EthereumProvider, CommunicationBridge, setupEIP6963, DEFAULT_WALLET_ICON }

// Export for TypeScript
export {}

// Extend Window interface
declare global {
  interface Window {
    ethereum?: EthereumProvider
    smartWalletPro?: EthereumProvider
  }
}

