# 🚀 Quick Reference - Smart Wallet Pro

## 📋 Commands

```bash
# Development
pnpm dev                    # Start dev server with hot reload

# Build
pnpm build                  # Build for production
pnpm package                # Package extension as .zip

# Extension Management
# chrome://extensions/      # Open extensions page
# Click reload icon         # Reload after changes
```

---

## 📁 Key Files

### Provider Injection
- `src/contents/inpage.ts` - MAIN world provider (window.ethereum)
- `src/contents/bridge.ts` - ISOLATED world bridge
- `src/page-provider/EthereumProvider.ts` - EIP-1193 implementation
- `src/page-provider/eip6963.ts` - Multi-wallet support

### Background
- `src/background/index.ts` - Service worker, RPC routing

### UI
- `src/approval.tsx` - Approval popup
- `src/components/wallet-selector.tsx` - Wallet selector
- `src/popup.tsx` - Main extension popup

### Services
- `src/services/wallet.ts` - Account management
- `src/services/signing.ts` - Message/transaction signing
- `src/services/balance.ts` - Balance fetching
- `src/services/transaction.ts` - Transaction handling

### Config
- `src/config/alchemy.ts` - Alchemy RPC configuration
- `src/config/chains.ts` - Supported networks

### Testing
- `test-dapp.html` - Complete test DApp

---

## 🔍 Debugging

### View Logs

**Page Console (F12):**
```
[Inpage] - Provider logs
[Content Script Bridge] - Bridge logs
```

**Background Console:**
```
chrome://extensions/ → Click "service worker"
[Background] - Service worker logs
```

**Check Provider:**
```javascript
// In page console
console.log(window.ethereum)
console.log(window.ethereum.isSmartWalletPro)
```

---

## 🧪 Testing Flow

### 1. Basic Test
```bash
1. pnpm dev
2. Reload extension
3. Open test-dapp.html
4. Click "Detect Wallets"
5. Should see "Smart Wallet Pro"
```

### 2. Connection Test
```bash
1. Click "Connect Wallet"
2. Approval popup opens
3. Click "Approve"
4. Account appears in test DApp
```

### 3. RPC Test
```javascript
// In test DApp or page console
await window.ethereum.request({ method: 'eth_accounts' })
await window.ethereum.request({ method: 'eth_chainId' })
await window.ethereum.request({ method: 'eth_requestAccounts' })
```

---

## 🎯 Common Tasks

### Create Account
```typescript
// In background console
import { createSmartAccount } from './services/wallet'
import { mainnet } from 'viem/chains'
await createSmartAccount('My Account', mainnet)
```

### Check Storage
```javascript
// In background console
chrome.storage.local.get(null, console.log)
```

### Clear Storage
```javascript
// In background console
chrome.storage.local.clear()
```

### Test EIP-6963
```javascript
// In page console
window.addEventListener('eip6963:announceProvider', console.log)
window.dispatchEvent(new Event('eip6963:requestProvider'))
```

---

## 🔧 Quick Fixes

### Provider Not Injected
```bash
1. Check content scripts loaded
2. Refresh page
3. Check console for errors
4. Verify manifest permissions
```

### Approval Popup Not Opening
```bash
1. Check background console
2. Verify popup blocker disabled
3. Check permissions
4. Rebuild: pnpm dev
```

### Account Not Found
```bash
1. Create account first
2. Check storage: chrome.storage.local.get(null, console.log)
3. Verify wallet service
```

### Signature Fails
```bash
1. Check Alchemy API key set
2. Verify account has private key
3. Check network supported
4. View background console errors
```

---

## 📊 Architecture Quick View

```
Webpage
  ↓ (RPC request)
window.ethereum (MAIN world)
  ↓ (BroadcastChannel)
Content Script Bridge (ISOLATED world)
  ↓ (chrome.runtime.Port)
Background Service Worker
  ↓ (opens popup / uses services)
Approval Popup ← → Wallet Services
```

---

## 🎨 UI Components

### Wallet Selector
```tsx
import WalletSelector from '~components/wallet-selector'

<WalletSelector 
  onWalletSelect={(wallet) => console.log(wallet)}
  autoDetect={true}
/>
```

### Wallet Selector Hook
```tsx
import { useWalletSelector } from '~components/wallet-selector'

const { wallets, detectWallets, selectWallet } = useWalletSelector()
```

---

## 🔐 Security Checklist

- [ ] Private keys encrypted
- [ ] Password protection
- [ ] Auto-lock enabled
- [ ] Phishing detection
- [ ] Rate limiting
- [ ] Transaction simulation
- [ ] Secure storage
- [ ] HTTPS only

---

## 📝 Environment Variables

```bash
# .env.local
PLASMO_PUBLIC_ALCHEMY_API_KEY=your_key_here
```

---

## 🌐 Supported Networks

- Ethereum Mainnet (1)
- Sepolia Testnet (11155111)
- Polygon (137)
- Optimism (10)
- Arbitrum (42161)
- Base (8453)

---

## 🔗 Useful Links

- [Plasmo Docs](https://docs.plasmo.com/)
- [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)
- [Alchemy AA](https://accountkit.alchemy.com/)
- [Viem Docs](https://viem.sh/)

---

## 🆘 Help

### Documentation
1. `WALLET_IMPLEMENTATION_COMPLETE.md` - Full guide
2. `NEXT_STEPS_IMPLEMENTATION.md` - Next steps
3. `TROUBLESHOOTING.md` - Common issues
4. `IMPLEMENTATION_SUMMARY.md` - What we built

### Check Logs
1. Page console (F12)
2. Background console (chrome://extensions/)
3. Test DApp console

### Common Errors

**"No account available"**
→ Create account first

**"Method not supported"**
→ Check background RPC routing

**"User rejected request"**
→ User clicked "Reject" in popup

**"Network not supported"**
→ Add network to chains.ts

---

## ✅ Quick Health Check

Run these to verify everything works:

```javascript
// 1. Provider exists
console.log(!!window.ethereum) // true

// 2. Is Smart Wallet Pro
console.log(window.ethereum.isSmartWalletPro) // true

// 3. Can request accounts
await window.ethereum.request({ method: 'eth_requestAccounts' })

// 4. Can get chain
await window.ethereum.request({ method: 'eth_chainId' })

// 5. Events work
window.ethereum.on('accountsChanged', console.log)
window.ethereum.on('chainChanged', console.log)
```

All should work without errors! ✨

---

## 🎯 Next Actions

1. **Test** - Open test-dapp.html and test all features
2. **Integrate** - Connect signing service to background
3. **Deploy** - Test with real DApps
4. **Polish** - Add error handling and UI improvements
5. **Launch** - Ship to users! 🚀

---

## 📞 Quick Commands Reference

```bash
# Start development
pnpm dev

# Reload extension
# chrome://extensions/ → reload

# View background logs
# chrome://extensions/ → service worker

# Test provider
open test-dapp.html

# Check storage
# Background console: chrome.storage.local.get(null, console.log)

# Clear storage
# Background console: chrome.storage.local.clear()
```

---

**Keep this file handy for quick reference! 📌**

