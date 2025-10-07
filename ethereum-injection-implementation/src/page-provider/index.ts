/**
 * Page Provider Entry Point
 * This file is injected into the web page context
 */

import { EthereumProvider } from './EthereumProvider';
import { CommunicationBridge } from './communication';
import {
  setupEIP6963,
  DEFAULT_WALLET_ICON,
  detectOtherWallets,
} from './eip6963';

// Prevent multiple injections
if (window.ethereum && (window.ethereum as any).__isYourWallet) {
  console.warn('Your Wallet is already injected');
} else {
  // Create provider instance
  const provider = new EthereumProvider();

  // Create communication bridge
  const bridge = new CommunicationBridge('ethereum-provider-bridge');

  // Initialize provider with bridge
  provider.initialize(bridge);

  // Listen for events from background
  bridge.on('connect', (data: { chainId: string }) => {
    provider._setConnected(true, data.chainId);
  });

  bridge.on('disconnect', (error?: any) => {
    provider._handleDisconnect(error);
  });

  bridge.on('accountsChanged', (accounts: string[]) => {
    provider._setAccounts(accounts);
  });

  bridge.on(
    'chainChanged',
    (data: { chainId: string; networkVersion?: string }) => {
      provider._setChain(data.chainId, data.networkVersion);
    }
  );

  bridge.on('message', (message: any) => {
    provider.emit('message', message);
  });

  // Setup EIP-6963 multi-wallet support
  const { announce, detectOthers } = setupEIP6963(provider, {
    name: 'Your Wallet', // Replace with your wallet name
    icon: DEFAULT_WALLET_ICON, // Replace with your wallet icon
    rdns: 'com.yourwallet', // Replace with your reverse DNS
  });

  // Detect other wallets and store them
  let otherProviders: any[] = [];
  detectOthers().then((providers) => {
    otherProviders = providers.filter((p) => p.info.rdns !== 'com.yourwallet');

    // If other wallets detected, store them for later use
    if (otherProviders.length > 0) {
      console.log(
        'Detected other wallets:',
        otherProviders.map((p) => p.info.name)
      );

      // Notify content script about other wallets
      bridge
        .request({
          method: 'wallet_reportOtherWallets',
          params: [otherProviders.map((p) => p.info)],
        })
        .catch(console.error);
    }
  });

  // Announce this wallet
  announce();

  // Inject into window
  Object.defineProperty(window, 'ethereum', {
    value: provider,
    writable: false,
    configurable: false,
  });

  // Also set as window.yourWallet for explicit access
  Object.defineProperty(window, 'yourWallet', {
    value: provider,
    writable: false,
    configurable: false,
  });

  // Mark as injected
  (provider as any).__isYourWallet = true;

  // Dispatch initialization event
  window.dispatchEvent(new Event('ethereum#initialized'));

  // Request initial state from background
  bridge
    .request({ method: 'wallet_getInitialState' })
    .then((state: any) => {
      if (state) {
        if (state.chainId) {
          provider._setChain(state.chainId, state.networkVersion);
        }
        if (state.accounts) {
          provider._setAccounts(state.accounts);
        }
        if (state.isConnected) {
          provider._setConnected(true, state.chainId);
        }
      }
    })
    .catch((error) => {
      console.error('Failed to get initial state:', error);
    });

  console.log('Your Wallet provider injected successfully');
}

// Export for TypeScript
export {};

// Extend Window interface
declare global {
  interface Window {
    ethereum?: EthereumProvider;
    yourWallet?: EthereumProvider;
  }
}
