# Example Usage

This document shows practical examples of how to use the Ethereum provider injection implementation.

## For Extension Developers

### Example 1: Basic Setup

```typescript
// src/background/index.ts
import { ProviderController } from './provider-controller';

// Initialize provider controller
const providerController = new ProviderController();

console.log('Wallet extension initialized');
```

### Example 2: Custom Wallet Implementation

```typescript
// src/background/wallet.ts
import { ethers } from 'ethers';
import browser from 'webextension-polyfill';

export class Wallet {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'
    );
  }

  async createWallet(): Promise<string> {
    const wallet = ethers.Wallet.createRandom();
    
    // Store encrypted (use proper encryption in production!)
    await browser.storage.local.set({
      encryptedPrivateKey: wallet.privateKey, // ENCRYPT THIS!
      address: wallet.address,
    });

    this.signer = wallet.connect(this.provider);
    return wallet.address;
  }

  async importWallet(privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    
    await browser.storage.local.set({
      encryptedPrivateKey: privateKey, // ENCRYPT THIS!
      address: wallet.address,
    });

    this.signer = wallet.connect(this.provider);
    return wallet.address;
  }

  async getAddress(): Promise<string | null> {
    const result = await browser.storage.local.get('address');
    return result.address || null;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) throw new Error('No wallet loaded');
    return this.signer.signMessage(message);
  }

  async sendTransaction(tx: ethers.providers.TransactionRequest): Promise<string> {
    if (!this.signer) throw new Error('No wallet loaded');
    const transaction = await this.signer.sendTransaction(tx);
    return transaction.hash;
  }
}

export default new Wallet();
```

### Example 3: Approval Popup

```typescript
// src/background/approval-manager.ts
import browser from 'webextension-polyfill';

interface ApprovalRequest {
  id: string;
  type: 'connect' | 'sign' | 'transaction';
  data: any;
  origin: string;
}

export class ApprovalManager {
  private pendingApprovals = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  async requestApproval(request: ApprovalRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pendingApprovals.set(request.id, { resolve, reject });

      // Open approval popup
      browser.windows.create({
        url: `approval.html?id=${request.id}`,
        type: 'popup',
        width: 400,
        height: 600,
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingApprovals.has(request.id)) {
          this.rejectApproval(request.id, new Error('Approval timeout'));
        }
      }, 5 * 60 * 1000);
    });
  }

  approveRequest(id: string, result: any): void {
    const pending = this.pendingApprovals.get(id);
    if (pending) {
      pending.resolve(result);
      this.pendingApprovals.delete(id);
    }
  }

  rejectApproval(id: string, error: Error): void {
    const pending = this.pendingApprovals.get(id);
    if (pending) {
      pending.reject(error);
      this.pendingApprovals.delete(id);
    }
  }
}

export default new ApprovalManager();
```

### Example 4: Multi-Chain Support

```typescript
// src/background/chain-manager.ts
interface ChainConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export class ChainManager {
  private chains: Map<string, ChainConfig> = new Map([
    ['0x1', {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
      blockExplorer: 'https://etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    }],
    ['0x89', {
      chainId: '0x89',
      name: 'Polygon',
      rpcUrl: 'https://polygon-rpc.com',
      blockExplorer: 'https://polygonscan.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    }],
  ]);

  getChain(chainId: string): ChainConfig | undefined {
    return this.chains.get(chainId);
  }

  addChain(config: ChainConfig): void {
    this.chains.set(config.chainId, config);
  }

  async switchChain(chainId: string): Promise<void> {
    const chain = this.getChain(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not found`);
    }

    await browser.storage.local.set({ currentChain: chainId });
    
    // Notify all tabs
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, {
          type: 'chainChanged',
          chainId,
        });
      }
    }
  }
}

export default new ChainManager();
```

## For DApp Developers

### Example 1: Detect and Connect

```javascript
// Detect wallet
if (typeof window.ethereum !== 'undefined') {
  console.log('Ethereum wallet detected!');
  
  // Check if it's your wallet
  if (window.ethereum.isYourWallet) {
    console.log('Your Wallet is installed!');
  }
}

// Connect to wallet
async function connect() {
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    console.log('Connected:', accounts[0]);
    return accounts[0];
  } catch (error) {
    console.error('User rejected connection:', error);
  }
}
```

### Example 2: Listen for Events

```javascript
// Listen for account changes
window.ethereum.on('accountsChanged', (accounts) => {
  console.log('Account changed:', accounts[0]);
  // Update UI
  updateAccountDisplay(accounts[0]);
});

// Listen for chain changes
window.ethereum.on('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId);
  // Reload the page (recommended by MetaMask)
  window.location.reload();
});

// Listen for disconnect
window.ethereum.on('disconnect', (error) => {
  console.log('Disconnected:', error);
  // Update UI
  showDisconnectedState();
});
```

### Example 3: Sign Message

```javascript
async function signMessage(message) {
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    });
    
    if (accounts.length === 0) {
      throw new Error('No accounts connected');
    }

    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, accounts[0]]
    });

    console.log('Signature:', signature);
    return signature;
  } catch (error) {
    console.error('Signing failed:', error);
  }
}

// Usage
signMessage('Hello, Web3!');
```

### Example 4: Send Transaction

```javascript
async function sendTransaction(to, value) {
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts'
    });

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to: to,
        value: value, // in wei (hex)
        gas: '0x5208', // 21000
      }]
    });

    console.log('Transaction hash:', txHash);
    return txHash;
  } catch (error) {
    console.error('Transaction failed:', error);
  }
}

// Usage: Send 0.1 ETH
sendTransaction(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  '0x16345785D8A0000' // 0.1 ETH in wei
);
```

### Example 5: EIP-6963 Multi-Wallet Detection

```javascript
// Store detected wallets
const wallets = [];

// Listen for wallet announcements
window.addEventListener('eip6963:announceProvider', (event) => {
  const { info, provider } = event.detail;
  
  wallets.push({
    info,
    provider
  });
  
  console.log('Detected wallet:', info.name);
  
  // Update UI with wallet options
  addWalletOption(info);
});

// Request wallet announcements
window.dispatchEvent(new Event('eip6963:requestProvider'));

// Wait a bit for responses
setTimeout(() => {
  console.log('Total wallets detected:', wallets.length);
  showWalletSelector(wallets);
}, 500);

// Use specific wallet
function useWallet(rdns) {
  const wallet = wallets.find(w => w.info.rdns === rdns);
  if (wallet) {
    // Use this provider
    const provider = wallet.provider;
    provider.request({ method: 'eth_requestAccounts' });
  }
}
```

### Example 6: React Integration

```jsx
import { useState, useEffect } from 'react';

function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!window.ethereum) return;

    // Get initial state
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      });

    window.ethereum.request({ method: 'eth_chainId' })
      .then(setChainId);

    // Listen for changes
    const handleAccountsChanged = (accounts) => {
      setAccount(accounts[0] || null);
      setIsConnected(accounts.length > 0);
    };

    const handleChainChanged = (chainId) => {
      setChainId(chainId);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = async () => {
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
  };

  return { account, chainId, isConnected, connect, disconnect };
}

// Usage in component
function App() {
  const { account, chainId, isConnected, connect } = useWallet();

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {account}</p>
          <p>Chain: {chainId}</p>
        </div>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Example 7: Sign Typed Data (EIP-712)

```javascript
async function signTypedData() {
  const accounts = await window.ethereum.request({
    method: 'eth_accounts'
  });

  const msgParams = {
    domain: {
      chainId: 1,
      name: 'My DApp',
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      version: '1',
    },
    message: {
      contents: 'Hello, Web3!',
      from: {
        name: 'Alice',
        wallet: accounts[0],
      },
      to: {
        name: 'Bob',
        wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      },
    },
    primaryType: 'Mail',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
      ],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
    },
  };

  try {
    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [accounts[0], JSON.stringify(msgParams)],
    });
    
    console.log('Signature:', signature);
    return signature;
  } catch (error) {
    console.error('Signing failed:', error);
  }
}
```

## Testing Examples

### Test with Jest

```javascript
// __tests__/provider.test.js
describe('Ethereum Provider', () => {
  beforeEach(() => {
    // Mock window.ethereum
    global.window.ethereum = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  test('should connect to wallet', async () => {
    window.ethereum.request.mockResolvedValue(['0x123...']);
    
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    expect(accounts).toEqual(['0x123...']);
  });

  test('should handle rejection', async () => {
    window.ethereum.request.mockRejectedValue(
      new Error('User rejected')
    );
    
    await expect(
      window.ethereum.request({ method: 'eth_requestAccounts' })
    ).rejects.toThrow('User rejected');
  });
});
```

## Production Checklist

- [ ] Implement secure key storage (encryption)
- [ ] Add proper error handling
- [ ] Implement rate limiting
- [ ] Add analytics
- [ ] Test on all supported browsers
- [ ] Test with popular dApps
- [ ] Implement backup/recovery
- [ ] Add transaction history
- [ ] Implement gas estimation
- [ ] Add network switching UI
- [ ] Test multi-wallet scenarios
- [ ] Add comprehensive logging
- [ ] Implement CSP properly
- [ ] Test with hardware wallets
- [ ] Add internationalization
- [ ] Implement dark mode
- [ ] Add accessibility features
- [ ] Write user documentation
- [ ] Set up error monitoring
- [ ] Implement auto-updates
- [ ] Add security audit

## Resources

- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)
- [MetaMask Docs](https://docs.metamask.io/)

