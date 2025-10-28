/**
 * MAIN World Content Script - Inpage Provider
 * This runs in the page's JavaScript context and has access to window object
 * 
 * Plasmo will inject this into the MAIN world automatically
 */

import type { PlasmoCSConfig } from "plasmo"

// Configure this script to run in MAIN world
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start",
  all_frames: false
}

// Import the provider implementation
// Note: We need to inline or bundle these since MAIN world has limited import support
import { EthereumProvider } from "~page-provider/EthereumProvider"
import { CommunicationBridge } from "~page-provider/communication"
import { setupEIP6963, DEFAULT_WALLET_ICON } from "~page-provider/eip6963"

console.log('[Inpage] Starting Smart Wallet Pro injection...')

// Prevent multiple injections
if (window.ethereum && (window.ethereum as any).__isSmartWalletPro) {
  console.warn('[Inpage] Smart Wallet Pro is already injected')
} else {
  try {
    console.log('[Inpage] Creating provider instance...')
    // Create provider instance
    const provider = new EthereumProvider()

    console.log('[Inpage] Creating communication bridge...')
    // Create communication bridge
    const bridge = new CommunicationBridge('ethereum-provider-bridge')

    console.log('[Inpage] Initializing provider with bridge...')
    // Initialize provider with bridge
    provider.initialize(bridge)

    // Listen for events from background via content script
    bridge.on('connect', (data: { chainId: string }) => {
      provider._setConnected(true, data.chainId)
    })

    bridge.on('disconnect', (error?: any) => {
      provider._handleDisconnect(error)
    })

    bridge.on('accountsChanged', (accounts: string[]) => {
      provider._setAccounts(accounts)
    })

    bridge.on('chainChanged', (data: { chainId: string; networkVersion?: string }) => {
      provider._setChain(data.chainId, data.networkVersion)
    })

    bridge.on('message', (message: any) => {
      provider.emit('message', message)
    })

    // Setup EIP-6963 multi-wallet support
    const { announce, detectOthers } = setupEIP6963(provider, {
      name: 'Smart Wallet Pro',
      icon: DEFAULT_WALLET_ICON,
      rdns: 'com.smartwalletpro',
    })

    // Detect other wallets and store them
    detectOthers().then((providers) => {
      const otherProviders = providers.filter(p => p.info.rdns !== 'com.smartwalletpro')
      
      if (otherProviders.length > 0) {
        console.log('[Inpage] Detected other wallets:', otherProviders.map(p => p.info.name))
        
        // Notify content script about other wallets
        bridge.request({
          method: 'wallet_reportOtherWallets',
          params: [otherProviders.map(p => p.info)],
        }).catch(console.error)
      }
    })

    // Announce this wallet
    announce()

    // Inject into window
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
      configurable: false,
    })

    // Also set as window.smartWalletPro for explicit access
    Object.defineProperty(window, 'smartWalletPro', {
      value: provider,
      writable: false,
      configurable: false,
    })

    // Mark as injected
    ;(provider as any).__isSmartWalletPro = true

    // Dispatch initialization event
    window.dispatchEvent(new Event('ethereum#initialized'))

    console.log('[Inpage] Smart Wallet Pro provider injected successfully')
  } catch (error) {
    console.error('[Inpage] Failed to inject provider:', error)
  }
}

// Remove the old manual state sync logic - now handled internally by the provider
// setTimeout(() => {
//   bridge.request({ method: 'wallet_getInitialState' })
//     .then((state: any) => {
//       console.log('[Inpage] Received initial state:', state)
//       if (state) {
//         if (state.chainId) {
//           provider._setChain(state.chainId, state.networkVersion)
//         }
//         if (state.accounts) {
//           provider._setAccounts(state.accounts)
//         }
//         if (state.isConnected) {
//           provider._setConnected(true, state.chainId)
//         }
//       }
//     })
//     .catch((error) => {
//       console.warn('[Inpage] Failed to get initial state (this is normal if bridge is not ready yet):', error.message)
//     })
// }, 100)

// Export for TypeScript
export {}
