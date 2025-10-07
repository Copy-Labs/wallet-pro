/**
 * EIP-6963: Multi Injector Provider Discovery
 * Allows multiple wallets to coexist and be discovered by dApps
 */

import { EthereumProvider } from './EthereumProvider';

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string; // Reverse DNS name (e.g., "com.yourwallet")
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EthereumProvider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export interface EIP6963RequestProviderEvent extends Event {
  type: 'eip6963:requestProvider';
}

/**
 * Generate a unique UUID for this provider instance
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Announce this wallet to the page (EIP-6963)
 */
export function announceProvider(
  provider: EthereumProvider,
  info: Omit<EIP6963ProviderInfo, 'uuid'>
): void {
  const providerDetail: EIP6963ProviderDetail = {
    info: {
      uuid: generateUUID(),
      name: info.name,
      icon: info.icon,
      rdns: info.rdns,
    },
    provider,
  };

  // Announce to the page
  const announceEvent: EIP6963AnnounceProviderEvent = new CustomEvent(
    'eip6963:announceProvider',
    { detail: Object.freeze(providerDetail) }
  ) as EIP6963AnnounceProviderEvent;

  window.dispatchEvent(announceEvent);

  // Listen for requests from dApps
  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(announceEvent);
  });
}

/**
 * Detect other wallets on the page (EIP-6963)
 */
export function detectOtherWallets(): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    const providers: EIP6963ProviderDetail[] = [];
    const timeout = setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
      resolve(providers);
    }, 500); // Wait 500ms for responses

    function handleAnnounce(event: Event) {
      const announceEvent = event as EIP6963AnnounceProviderEvent;
      if (announceEvent.detail) {
        providers.push(announceEvent.detail);
      }
    }

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    
    // Request providers
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  });
}

/**
 * Setup EIP-6963 for your wallet
 */
export function setupEIP6963(
  provider: EthereumProvider,
  walletInfo: {
    name: string;
    icon: string;
    rdns: string;
  }
): {
  announce: () => void;
  detectOthers: () => Promise<EIP6963ProviderDetail[]>;
} {
  const announce = () => announceProvider(provider, walletInfo);
  const detectOthers = () => detectOtherWallets();

  return {
    announce,
    detectOthers,
  };
}

/**
 * Create a data URI icon from SVG
 */
export function createIconDataUri(svgString: string): string {
  const base64 = btoa(svgString);
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Example wallet icon (replace with your own)
 */
export const DEFAULT_WALLET_ICON = createIconDataUri(`
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#7C3AED"/>
  <path d="M16 8L8 12V20L16 24L24 20V12L16 8Z" fill="white"/>
  <path d="M16 12L12 14V18L16 20L20 18V14L16 12Z" fill="#7C3AED"/>
</svg>
`);

/**
 * Check if EIP-6963 is supported
 */
export function isEIP6963Supported(): boolean {
  return typeof window !== 'undefined' && 
         typeof CustomEvent !== 'undefined' &&
         typeof window.dispatchEvent === 'function';
}

/**
 * Store wallet preference for a site
 */
export interface WalletPreference {
  rdns: string;
  timestamp: number;
}

export class WalletPreferenceManager {
  private readonly STORAGE_KEY = 'wallet_preferences';

  /**
   * Get preferred wallet for current origin
   */
  getPreference(origin: string = window.location.origin): WalletPreference | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const preferences = JSON.parse(stored);
      return preferences[origin] || null;
    } catch (error) {
      console.error('Failed to get wallet preference:', error);
      return null;
    }
  }

  /**
   * Set preferred wallet for current origin
   */
  setPreference(rdns: string, origin: string = window.location.origin): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const preferences = stored ? JSON.parse(stored) : {};
      
      preferences[origin] = {
        rdns,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to set wallet preference:', error);
    }
  }

  /**
   * Clear preference for current origin
   */
  clearPreference(origin: string = window.location.origin): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const preferences = JSON.parse(stored);
      delete preferences[origin];

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to clear wallet preference:', error);
    }
  }

  /**
   * Clear all preferences
   */
  clearAllPreferences(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear all preferences:', error);
    }
  }
}

export default {
  announceProvider,
  detectOtherWallets,
  setupEIP6963,
  createIconDataUri,
  DEFAULT_WALLET_ICON,
  isEIP6963Supported,
  WalletPreferenceManager,
};

