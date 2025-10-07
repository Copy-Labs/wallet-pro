# Ethereum Provider Injection & Wallet Switcher Implementation

This is a complete implementation guide for adding Ethereum provider injection and multi-wallet switching to your browser extension wallet project.

## Features

- ✅ EIP-1193 compliant Ethereum provider
- ✅ EIP-6963 multi-wallet detection and switching
- ✅ Manifest V2 and V3 support
- ✅ MetaMask compatibility mode
- ✅ Secure communication between page, content script, and background
- ✅ Per-site wallet preference storage

## Architecture Overview

```
┌─────────────────┐
│   Web Page      │
│  (window.ethereum)│
└────────┬────────┘
         │ BroadcastChannel
┌────────▼────────┐
│ Content Script  │
│  (Isolated)     │
└────────┬────────┘
         │ Port/Runtime
┌────────▼────────┐
│   Background    │
│   (Service)     │
└─────────────────┘
```

## File Structure

```
your-extension/
├── src/
│   ├── content-script/
│   │   └── index.ts              # Injects page provider
│   ├── page-provider/
│   │   ├── index.ts              # Main provider (injected into page)
│   │   ├── EthereumProvider.ts   # EIP-1193 provider class
│   │   ├── communication.ts      # BroadcastChannel messaging
│   │   └── eip6963.ts           # Multi-wallet detection
│   ├── background/
│   │   ├── index.ts              # Background service worker
│   │   ├── provider-controller.ts # Handles RPC requests
│   │   └── wallet-controller.ts  # Wallet management
│   ├── ui/
│   │   └── components/
│   │       └── WalletSelector.tsx # UI for wallet switching
│   └── utils/
│       └── messaging.ts          # Shared messaging utilities
├── manifest.json                 # Extension manifest
└── webpack.config.js            # Build configuration
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install --save \
  @metamask/post-message-stream \
  eth-rpc-errors \
  events \
  nanoid \
  webextension-polyfill
```

### 2. Update Manifest

See `manifest-v2.json` and `manifest-v3.json` examples in this directory.

### 3. Configure Webpack

Add the page provider as a separate entry point that runs in the page context.

### 4. Implement Files

Follow the implementation files provided in this directory.

## Usage

### For Extension Developers

1. Copy the implementation files to your project
2. Update the manifest.json with required permissions
3. Configure webpack to bundle the page provider separately
4. Implement the background controller to handle RPC requests
5. Add UI components for wallet selection

### For DApp Developers

Your DApp will automatically detect multiple wallets:

```javascript
// Listen for wallet announcements (EIP-6963)
window.addEventListener('eip6963:announceProvider', (event) => {
  const { info, provider } = event.detail;
  console.log('Detected wallet:', info.name);
  // Show wallet selection UI
});

// Request wallet announcements
window.dispatchEvent(new Event('eip6963:requestProvider'));

// Use the provider
const accounts = await window.ethereum.request({ 
  method: 'eth_requestAccounts' 
});
```

## Key Implementation Details

### 1. Provider Injection (Content Script)

The content script injects the page provider into the page's context:

```typescript
const injectProvider = () => {
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('pageProvider.js');
  (document.head || document.documentElement).appendChild(script);
  script.remove();
};
```

### 2. EIP-1193 Provider

Implements the standard Ethereum provider interface:

```typescript
class EthereumProvider extends EventEmitter {
  async request({ method, params }) {
    // Handle eth_requestAccounts, eth_sendTransaction, etc.
  }
}
```

### 3. EIP-6963 Multi-Wallet Support

Announces your wallet to DApps and detects other wallets:

```typescript
// Announce your wallet
window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
  detail: {
    info: {
      uuid: crypto.randomUUID(),
      name: 'Your Wallet',
      icon: 'data:image/svg+xml,...',
      rdns: 'com.yourwallet'
    },
    provider: ethereumProvider
  }
}));
```

### 4. Communication Flow

```
Page → BroadcastChannel → Content Script → Port → Background
                                                      ↓
                                                  Process Request
                                                      ↓
Background → Port → Content Script → BroadcastChannel → Page
```

### 5. Wallet Switching

When user selects a different wallet:

```typescript
async function switchToWallet(rdns: string) {
  // Store preference
  await storage.set({ [`wallet_${origin}`]: rdns });
  
  // Notify page
  window.dispatchEvent(new CustomEvent('wallet:providerChanged', {
    detail: { rdns }
  }));
  
  // Disconnect current provider
  currentProvider.emit('disconnect');
}
```

## Security Considerations

1. **Content Security Policy**: Ensure your manifest allows script injection
2. **Message Validation**: Always validate messages between contexts
3. **Origin Checking**: Verify the origin of requests in the background
4. **Permission Management**: Store and check site permissions
5. **Secure Communication**: Use structured cloning for message passing

## Testing

```bash
# Build the extension
npm run build

# Load in browser
# Chrome: chrome://extensions (Enable Developer Mode)
# Firefox: about:debugging#/runtime/this-firefox

# Test with a DApp
# Visit https://metamask.github.io/test-dapp/
```

## Compatibility

- ✅ Chrome/Edge (Manifest V2 & V3)
- ✅ Firefox (Manifest V2)
- ✅ Brave
- ✅ Opera

## Resources

- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963: Multi Injector Provider Discovery](https://eips.ethereum.org/EIPS/eip-6963)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [WebExtension Polyfill](https://github.com/mozilla/webextension-polyfill)

## License

MIT

## Support

For issues and questions, please refer to the implementation files and comments.

