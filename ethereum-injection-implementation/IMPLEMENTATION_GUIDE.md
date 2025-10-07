# Complete Implementation Guide

This guide walks you through implementing Ethereum provider injection and wallet switching in your browser extension.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing](#testing)
5. [Common Issues](#common-issues)
6. [Advanced Topics](#advanced-topics)

## Quick Start

### Installation

```bash
# Clone or copy the implementation files
cd ethereum-injection-implementation

# Install dependencies
npm install

# Build for Manifest V2 (Chrome, Edge, Brave)
npm run build

# Or build for Manifest V3
npm run build:mv3

# For development with auto-rebuild
npm run dev
```

### Load Extension

**Chrome/Edge/Brave:**
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` in the `dist` folder

## Architecture Overview

### Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Web Page                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  window.ethereum (EthereumProvider)                │     │
│  │  - request({ method, params })                     │     │
│  │  - on('accountsChanged', ...)                      │     │
│  │  - on('chainChanged', ...)                         │     │
│  └──────────────────┬─────────────────────────────────┘     │
│                     │ BroadcastChannel                       │
└─────────────────────┼────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                  Content Script                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Bridge (BroadcastChannel ↔ Port)                 │     │
│  │  - Forwards requests to background                 │     │
│  │  - Forwards events to page                         │     │
│  └──────────────────┬─────────────────────────────────┘     │
│                     │ browser.runtime.Port                   │
└─────────────────────┼────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                Background Service Worker                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Provider Controller                               │     │
│  │  - Handles RPC requests                            │     │
│  │  - Manages permissions                             │     │
│  │  - Shows approval popups                           │     │
│  │  - Forwards to RPC nodes                           │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Page Provider** (`src/page-provider/`)
   - Injected into web page context
   - Implements EIP-1193 Ethereum provider
   - Handles EIP-6963 multi-wallet detection
   - Communicates via BroadcastChannel

2. **Content Script** (`src/content-script/`)
   - Runs in isolated context
   - Injects page provider
   - Bridges page ↔ background communication

3. **Background Service** (`src/background/`)
   - Handles RPC requests
   - Manages wallet state
   - Shows approval UI
   - Forwards to blockchain nodes

4. **UI Components** (`src/ui/`)
   - Wallet selector
   - Approval popups
   - Settings

## Step-by-Step Implementation

### Step 1: Setup Project Structure

```bash
mkdir my-wallet-extension
cd my-wallet-extension
npm init -y
```

Copy all files from this implementation to your project.

### Step 2: Customize Wallet Information

Edit `src/page-provider/index.ts`:

```typescript
const { announce, detectOthers } = setupEIP6963(provider, {
  name: 'My Awesome Wallet',        // Your wallet name
  icon: YOUR_WALLET_ICON,            // Your wallet icon (data URI)
  rdns: 'com.myawesomewallet',       // Your reverse DNS
});
```

### Step 3: Implement RPC Forwarding

Edit `src/background/provider-controller.ts`:

```typescript
private getRPCUrl(chainId: string): string {
  const rpcUrls: Record<string, string> = {
    '0x1': 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    '0x89': 'https://polygon-rpc.com',
    '0xa4b1': 'https://arb1.arbitrum.io/rpc',
    // Add your RPC endpoints
  };
  return rpcUrls[chainId] || rpcUrls['0x1'];
}
```

### Step 4: Implement Wallet Storage

Create `src/background/wallet-storage.ts`:

```typescript
import browser from 'webextension-polyfill';

export class WalletStorage {
  async getAccounts(): Promise<string[]> {
    const result = await browser.storage.local.get('accounts');
    return result.accounts || [];
  }

  async setAccounts(accounts: string[]): Promise<void> {
    await browser.storage.local.set({ accounts });
  }

  async getCurrentChain(): Promise<string> {
    const result = await browser.storage.local.get('currentChain');
    return result.currentChain || '0x1';
  }

  async setCurrentChain(chainId: string): Promise<void> {
    await browser.storage.local.set({ currentChain: chainId });
  }

  async isOriginConnected(origin: string): Promise<boolean> {
    const result = await browser.storage.local.get(`connected_${origin}`);
    return !!result[`connected_${origin}`];
  }

  async saveConnection(origin: string, accounts: string[]): Promise<void> {
    await browser.storage.local.set({
      [`connected_${origin}`]: {
        accounts,
        timestamp: Date.now(),
      },
    });
  }
}

export default new WalletStorage();
```

### Step 5: Implement Approval UI

Create `src/ui/approval.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Approve Request</title>
  <link rel="stylesheet" href="approval.css">
</head>
<body>
  <div id="approval-container">
    <div class="approval-header">
      <img id="site-icon" src="" alt="Site icon">
      <h2 id="site-name"></h2>
    </div>
    <div class="approval-content">
      <p id="approval-message"></p>
      <div id="approval-details"></div>
    </div>
    <div class="approval-actions">
      <button id="reject-btn" class="btn btn-secondary">Reject</button>
      <button id="approve-btn" class="btn btn-primary">Approve</button>
    </div>
  </div>
  <script src="approval.js"></script>
</body>
</html>
```

### Step 6: Handle Signing

Implement signing in `src/background/signer.ts`:

```typescript
import { ethers } from 'ethers';

export class Signer {
  private wallet: ethers.Wallet | null = null;

  async initialize(privateKey: string): Promise<void> {
    this.wallet = new ethers.Wallet(privateKey);
  }

  async personalSign(message: string): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    return this.wallet.signMessage(message);
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    return this.wallet._signTypedData(domain, types, value);
  }

  async signTransaction(tx: any): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized');
    return this.wallet.signTransaction(tx);
  }

  getAddress(): string {
    if (!this.wallet) throw new Error('Wallet not initialized');
    return this.wallet.address;
  }
}

export default new Signer();
```

### Step 7: Build and Test

```bash
# Build the extension
npm run build

# Load in browser and test with:
# - https://metamask.github.io/test-dapp/
# - https://app.uniswap.org/
# - Your own dApp
```

## Testing

### Test with MetaMask Test DApp

1. Visit https://metamask.github.io/test-dapp/
2. Click "Connect"
3. Your wallet should appear in the list
4. Test various operations:
   - eth_requestAccounts
   - personal_sign
   - eth_signTypedData_v4
   - eth_sendTransaction

### Test Multi-Wallet Detection

1. Install MetaMask or another wallet
2. Visit a dApp
3. Your wallet selector should appear
4. Switch between wallets
5. Verify the correct provider is used

### Automated Testing

Create `tests/provider.test.ts`:

```typescript
import { EthereumProvider } from '../src/page-provider/EthereumProvider';

describe('EthereumProvider', () => {
  let provider: EthereumProvider;

  beforeEach(() => {
    provider = new EthereumProvider();
  });

  test('should implement EIP-1193', () => {
    expect(provider.request).toBeDefined();
    expect(provider.isConnected).toBeDefined();
  });

  test('should handle eth_accounts', async () => {
    provider._setAccounts(['0x123...']);
    const accounts = await provider.request({ method: 'eth_accounts' });
    expect(accounts).toEqual(['0x123...']);
  });

  test('should emit accountsChanged', (done) => {
    provider.on('accountsChanged', (accounts) => {
      expect(accounts).toEqual(['0x456...']);
      done();
    });
    provider._setAccounts(['0x456...']);
  });
});
```

## Common Issues

### Issue 1: Provider Not Injected

**Symptoms:** `window.ethereum` is undefined

**Solutions:**
- Check content script is running: `console.log` in content-script/index.ts
- Verify `web_accessible_resources` in manifest.json
- Check CSP (Content Security Policy) settings
- Ensure script runs at `document_start`

### Issue 2: Communication Timeout

**Symptoms:** Requests timeout, no response

**Solutions:**
- Verify BroadcastChannel name matches in page and content script
- Check background service worker is running
- Look for errors in background console
- Ensure port connection is established

### Issue 3: Multiple Wallets Conflict

**Symptoms:** Wrong wallet responds to requests

**Solutions:**
- Implement proper EIP-6963 announcement
- Check injection order (inject early)
- Use unique `rdns` identifier
- Store and respect user's wallet preference

### Issue 4: Events Not Firing

**Symptoms:** `accountsChanged`, `chainChanged` not working

**Solutions:**
- Verify event forwarding in content script
- Check provider is properly initialized
- Ensure events are emitted from background
- Test with `provider.on('accountsChanged', console.log)`

## Advanced Topics

### Custom RPC Methods

Add custom methods to your provider:

```typescript
// In provider-controller.ts
case 'wallet_customMethod':
  return this.handleCustomMethod(params, context);
```

### Transaction Simulation

Integrate with services like Tenderly:

```typescript
async simulateTransaction(tx: any): Promise<any> {
  const response = await fetch('https://api.tenderly.co/api/v1/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx }),
  });
  return response.json();
}
```

### Hardware Wallet Support

Integrate Ledger/Trezor:

```typescript
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import Eth from '@ledgerhq/hw-app-eth';

async function signWithLedger(tx: any): Promise<string> {
  const transport = await TransportWebHID.create();
  const eth = new Eth(transport);
  const signature = await eth.signTransaction(path, tx);
  return signature;
}
```

### Gas Optimization

Implement EIP-1559 gas estimation:

```typescript
async function estimateGas(tx: any): Promise<{
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}> {
  // Use services like Blocknative or your own estimation
  const gasPrice = await provider.getGasPrice();
  return {
    maxFeePerGas: gasPrice.mul(120).div(100).toString(),
    maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei').toString(),
  };
}
```

## Next Steps

1. Implement secure key storage (encrypted)
2. Add transaction history
3. Implement token management
4. Add network switching UI
5. Implement WalletConnect
6. Add hardware wallet support
7. Implement multi-chain support
8. Add analytics and error tracking

## Resources

- [EIP-1193 Spec](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963 Spec](https://eips.ethereum.org/EIPS/eip-6963)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Provider API](https://docs.metamask.io/wallet/reference/provider-api/)

