# Plasmo Ethereum Provider Implementation Checklist

## ✅ Completed

- [x] Created MAIN world content script (`src/contents/inpage.ts`)
- [x] Updated ISOLATED world content script (`src/content/index.ts`)
- [x] Existing provider implementation (`src/page-provider/`)
- [x] Background service worker skeleton (`src/background/index.ts`)
- [x] Documentation and guide

## 🔧 What Changed

### 1. **New File: `src/contents/inpage.ts`**
This is the key change! This file:
- Runs in the MAIN world (page's JavaScript context)
- Has access to `window.ethereum`
- Uses Plasmo's automatic injection (no manual script tags)
- Configured with `world: "MAIN"` in PlasmoCSConfig

### 2. **Updated: `src/content/index.ts`**
Simplified to:
- Remove manual script injection code
- Focus only on bridging communication
- Runs in ISOLATED world (default)
- Connects to background service worker

### 3. **Deprecated: `src/page-provider/index.ts`**
- No longer used as entry point
- Kept for reference
- Logic moved to `src/contents/inpage.ts`

## 📋 Next Steps to Complete Implementation

### Immediate (Required for Basic Functionality)

1. **Test the Injection**
   ```bash
   pnpm dev
   ```
   - Load extension in Chrome
   - Open any webpage
   - Check console for: `[Inpage] Smart Wallet Pro provider injected successfully`
   - Test: `console.log(window.ethereum)` in page console

2. **Verify Communication Flow**
   - Check all three console logs appear:
     - `[Inpage]` logs in page console
     - `[Content Script]` logs in page console
     - `[Background]` logs in extension service worker console

3. **Update Background Service Worker**
   The current `src/background/index.ts` has TODO placeholders. Implement:
   - [ ] Actual wallet state management
   - [ ] Real account retrieval from storage
   - [ ] RPC provider integration (use Alchemy config)
   - [ ] Approval popup UI

### Short Term (Core Wallet Features)

4. **Implement Wallet State Management**
   ```typescript
   // In src/services/wallet.ts or similar
   - [ ] Store/retrieve private keys securely
   - [ ] Manage active account
   - [ ] Handle account switching
   - [ ] Persist wallet state
   ```

5. **Create Approval UI**
   ```typescript
   // Create src/approval.tsx or similar
   - [ ] Transaction approval screen
   - [ ] Signature request screen
   - [ ] Connection request screen
   - [ ] Chain switching confirmation
   ```

6. **Integrate with Alchemy**
   ```typescript
   // Update src/background/index.ts
   - [ ] Use existing Alchemy config from src/config/alchemy.ts
   - [ ] Forward RPC requests to Alchemy
   - [ ] Handle responses properly
   ```

### Medium Term (Enhanced Features)

7. **Implement Account Abstraction**
   ```typescript
   // You already have @alchemy/aa-core installed
   - [ ] Integrate smart account creation
   - [ ] Handle UserOperation signing
   - [ ] Implement bundler communication
   ```

8. **Add Transaction History**
   ```typescript
   - [ ] Store transaction history
   - [ ] Display in popup UI
   - [ ] Handle pending transactions
   ```

9. **Network Management**
   ```typescript
   // Use existing src/config/chains.ts
   - [ ] Implement chain switching
   - [ ] Add custom networks
   - [ ] Handle network errors
   ```

### Long Term (Polish & Features)

10. **EIP-6963 Wallet Selection UI**
    ```typescript
    - [ ] Show detected wallets to user
    - [ ] Allow user to choose default wallet
    - [ ] Handle wallet conflicts gracefully
    ```

11. **Security Enhancements**
    ```typescript
    - [ ] Implement origin allowlist
    - [ ] Add phishing detection
    - [ ] Secure key storage
    - [ ] Add session management
    ```

12. **Testing**
    ```typescript
    - [ ] Unit tests for provider
    - [ ] Integration tests for communication
    - [ ] E2E tests with real DApps
    ```

## 🧪 Testing Guide

### Manual Testing Steps

1. **Basic Injection Test**
   ```javascript
   // In browser console on any webpage
   console.log(window.ethereum)
   // Should show EthereumProvider instance
   
   console.log(window.ethereum.isSmartWalletPro)
   // Should be true
   ```

2. **Request Accounts Test**
   ```javascript
   await window.ethereum.request({ method: 'eth_requestAccounts' })
   // Should trigger your wallet (currently returns mock data)
   ```

3. **Chain ID Test**
   ```javascript
   await window.ethereum.request({ method: 'eth_chainId' })
   // Should return '0x1' (or your configured chain)
   ```

4. **Event Listener Test**
   ```javascript
   window.ethereum.on('accountsChanged', (accounts) => {
     console.log('Accounts changed:', accounts)
   })
   
   window.ethereum.on('chainChanged', (chainId) => {
     console.log('Chain changed:', chainId)
   })
   ```

### Test with Real DApps

1. **Uniswap**: https://app.uniswap.org
   - Should detect wallet
   - Test connection
   - Test transaction signing

2. **OpenSea**: https://opensea.io
   - Test wallet connection
   - Test signature requests

3. **WalletConnect Test DApp**: https://react-app.walletconnect.com
   - Comprehensive provider testing

## 🐛 Common Issues & Solutions

### Issue: `window.ethereum` is undefined

**Solution:**
- Check that `src/contents/inpage.ts` has `world: "MAIN"` in config
- Verify extension is loaded and active
- Check browser console for injection errors
- Ensure `run_at: "document_start"` is set

### Issue: Communication timeout

**Solution:**
- Verify BroadcastChannel name matches in both scripts
- Check background service worker is running (chrome://extensions)
- Look for port connection errors in console
- Ensure both content scripts are loaded

### Issue: Multiple wallets conflict

**Solution:**
- Check injection order (document_start helps)
- Verify unique `rdns` in EIP-6963 setup
- Test with other wallets disabled first
- Implement proper EIP-6963 handling

### Issue: TypeScript errors in MAIN world

**Solution:**
- Ensure imports use `~` alias (configured in tsconfig.json)
- Check that all dependencies are properly bundled
- Verify PlasmoCSConfig is correctly typed
- Don't use chrome.* APIs in MAIN world

## 📚 Key Files Reference

```
src/
├── contents/
│   └── inpage.ts              # ⭐ NEW: MAIN world provider injection
├── content/
│   └── index.ts               # ✏️ UPDATED: ISOLATED world bridge
├── page-provider/
│   ├── EthereumProvider.ts    # ✅ Keep: Provider implementation
│   ├── communication.ts       # ✅ Keep: BroadcastChannel bridge
│   ├── eip6963.ts            # ✅ Keep: Multi-wallet support
│   └── index.ts              # ⚠️ DEPRECATED: Old entry point
├── background/
│   └── index.ts              # 🔧 TODO: Implement wallet logic
└── config/
    ├── alchemy.ts            # ✅ Use: Alchemy configuration
    └── chains.ts             # ✅ Use: Chain configurations
```

## 🎯 Priority Order

1. **Test current implementation** (30 min)
2. **Implement basic wallet state** (2-3 hours)
3. **Create approval UI** (3-4 hours)
4. **Integrate Alchemy RPC** (1-2 hours)
5. **Test with real DApps** (1-2 hours)
6. **Implement account abstraction** (4-6 hours)
7. **Add remaining features** (ongoing)

## 💡 Tips

- Start with testing the injection before implementing wallet logic
- Use mock data initially to test the communication flow
- Test with MetaMask disabled to avoid conflicts
- Check all three console contexts (page, content script, background)
- Use Chrome DevTools for debugging each context separately

## 🔗 Useful Commands

```bash
# Development with hot reload
pnpm dev

# Build for production
pnpm build

# Package for distribution
pnpm package

# Clean build artifacts
rm -rf build/ .plasmo/
```

## ✨ Success Criteria

Your implementation is working when:
- [ ] `window.ethereum` is defined on any webpage
- [ ] DApps can detect your wallet
- [ ] Connection requests work
- [ ] Transaction signing works
- [ ] Events are properly emitted
- [ ] No console errors
- [ ] Works alongside other wallets (EIP-6963)

