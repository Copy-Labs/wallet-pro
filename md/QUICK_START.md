# Quick Start Guide - Testing Your Ethereum Provider

## 🚀 Getting Started (5 minutes)

### 1. Build the Extension

```bash
# Install dependencies (if not already done)
pnpm install

# Start development server with hot reload
pnpm dev
```

You should see output like:
```
✓ Built in XXXms
✓ Extension built successfully
📦 Output: build/chrome-mv3-dev
```

### 2. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `build/chrome-mv3-dev` folder
5. Your extension should appear in the list

### 3. Verify Extension is Loaded

Check that you see:
- ✅ Extension icon in toolbar
- ✅ No errors in the extension card
- ✅ "Service worker" status shows "active"

## 🧪 Testing the Provider Injection

### Test 1: Basic Injection (30 seconds)

1. Open any website (e.g., `https://example.com`)
2. Open browser DevTools (F12)
3. Go to Console tab
4. Type:

```javascript
window.ethereum
```

**Expected Result:**
```javascript
EthereumProvider {
  chainId: null,
  selectedAddress: null,
  isSmartWalletPro: true,
  isMetaMask: true,
  // ... more properties
}
```

**If you see `undefined`:**
- Check the Console for error messages
- Look for `[Inpage]` logs
- Verify extension is enabled
- Try refreshing the page

### Test 2: Check Console Logs (1 minute)

You should see these logs in the page console:

```
[Inpage] Starting Smart Wallet Pro injection...
[Content Script] Initializing bridge...
[Inpage] Smart Wallet Pro provider injected successfully
[Content Script] Bridge initialized successfully
```

**Also check the Service Worker console:**
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "service worker" link
4. You should see:
```
[Background] Content script connected: ...
```

### Test 3: Provider Properties (1 minute)

In the page console, test these:

```javascript
// Check wallet identification
console.log(window.ethereum.isSmartWalletPro)  // true
console.log(window.ethereum.isMetaMask)        // true (for compatibility)

// Check methods exist
console.log(typeof window.ethereum.request)    // "function"
console.log(typeof window.ethereum.on)         // "function"
console.log(typeof window.ethereum.removeListener) // "function"

// Check it's frozen (security)
window.ethereum = null  // Should fail silently
console.log(window.ethereum)  // Still there!
```

### Test 4: Request Method (2 minutes)

Test the basic request flow:

```javascript
// This will currently return mock data
const chainId = await window.ethereum.request({ 
  method: 'eth_chainId' 
})
console.log('Chain ID:', chainId)  // Should be '0x1'

// This will also return mock data
const accounts = await window.ethereum.request({ 
  method: 'eth_accounts' 
})
console.log('Accounts:', accounts)  // Should be []
```

### Test 5: Event Listeners (2 minutes)

Test event subscription:

```javascript
// Add listeners
window.ethereum.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts)
})

window.ethereum.on('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId)
})

window.ethereum.on('connect', (info) => {
  console.log('Connected:', info)
})

console.log('Event listeners added successfully')
```

### Test 6: EIP-6963 Multi-Wallet (2 minutes)

Test wallet discovery:

```javascript
// Listen for wallet announcements
window.addEventListener('eip6963:announceProvider', (event) => {
  console.log('Wallet detected:', event.detail.info.name)
})

// Request all wallets
window.dispatchEvent(new Event('eip6963:requestProvider'))

// You should see your wallet announced
// If you have MetaMask or other wallets, they'll also announce
```

## 🔍 Debugging Guide

### Check All Three Contexts

Your extension runs in three separate JavaScript contexts:

#### 1. Page Context (MAIN World)
- **Where**: Any webpage's console
- **What to check**: `[Inpage]` logs
- **Access**: F12 → Console tab
- **Test**: `console.log(window.ethereum)`

#### 2. Content Script Context (ISOLATED World)
- **Where**: Same as page console
- **What to check**: `[Content Script]` logs
- **Access**: F12 → Console tab
- **Note**: Shares console with page but isolated execution

#### 3. Background Context (Service Worker)
- **Where**: Extension service worker
- **What to check**: `[Background]` logs
- **Access**: `chrome://extensions/` → Click "service worker"
- **Test**: Should see connection logs

### Common Issues

#### Issue: `window.ethereum` is undefined

**Check:**
1. Is extension enabled? (`chrome://extensions/`)
2. Did you refresh the page after loading extension?
3. Any errors in console?
4. Check `src/contents/inpage.ts` has `world: "MAIN"`

**Fix:**
```bash
# Rebuild
pnpm dev

# Hard refresh page
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

#### Issue: No console logs appear

**Check:**
1. Console filter settings (should show all levels)
2. Console is not cleared on navigation
3. Extension service worker is active

**Fix:**
- Click the filter icon in console
- Uncheck "Hide network"
- Check "Preserve log"

#### Issue: Communication timeout

**Check:**
1. Background service worker console for errors
2. BroadcastChannel name matches in both scripts
3. Port connection established

**Fix:**
```javascript
// In page console, check:
console.log(window.ethereum._bridge)
// Should show CommunicationBridge instance
```

#### Issue: Multiple wallets conflict

**Check:**
1. Other wallet extensions installed?
2. Which wallet injected first?

**Fix:**
- Disable other wallets temporarily
- Test EIP-6963 wallet selection
- Check injection order (document_start)

## 📊 Success Checklist

After testing, you should have:

- [x] `window.ethereum` is defined
- [x] All console logs appear in correct contexts
- [x] Provider properties are correct
- [x] Request method works (even with mock data)
- [x] Event listeners can be added
- [x] EIP-6963 announcement works
- [x] No console errors
- [x] Extension service worker is active

## 🎯 Next Steps

Once basic injection works:

### 1. Test with a Real DApp

Visit: https://app.uniswap.org

**Expected:**
- Wallet should be detected
- "Connect Wallet" button should work
- Your wallet should appear in the list

**Current Limitation:**
- Connection will fail because background logic is not implemented
- This is expected! You've verified injection works.

### 2. Implement Background Logic

Now that injection works, implement:
- Wallet state management
- Account handling
- Transaction signing
- RPC forwarding

See `IMPLEMENTATION_CHECKLIST.md` for details.

### 3. Create Approval UI

Build the popup for:
- Connection requests
- Transaction approvals
- Signature requests

### 4. Test End-to-End

Once background + UI is done:
- Connect to Uniswap
- Approve connection
- Sign a transaction
- Verify it works!

## 🐛 Still Having Issues?

### Enable Verbose Logging

Add more logs to debug:

```typescript
// In src/contents/inpage.ts
console.log('[Inpage] Provider created:', provider)
console.log('[Inpage] Bridge created:', bridge)
console.log('[Inpage] Window.ethereum set:', window.ethereum)

// In src/content/index.ts
console.log('[Content Script] Channel created:', this.channel)
console.log('[Content Script] Port connected:', this.port)

// In src/background/index.ts
console.log('[Background] Message received:', message)
console.log('[Background] Sending response:', response)
```

### Check Extension Manifest

```bash
# View generated manifest
cat build/chrome-mv3-dev/manifest.json
```

Should include:
```json
{
  "content_scripts": [
    {
      "js": ["contents/inpage.js"],
      "world": "MAIN"
    },
    {
      "js": ["content/index.js"]
    }
  ]
}
```

### Rebuild from Scratch

```bash
# Clean everything
rm -rf build/ .plasmo/ node_modules/.cache/

# Rebuild
pnpm dev

# Reload extension in Chrome
# Hard refresh test page
```

## 💡 Pro Tips

1. **Keep DevTools Open**: Monitor all three contexts simultaneously
2. **Use Preserve Log**: Don't lose logs on navigation
3. **Test Incognito**: Isolate from other extensions
4. **Check Network Tab**: See RPC requests (once implemented)
5. **Use React DevTools**: Debug popup UI (once built)

## 📚 Additional Resources

- `PLASMO_ETHEREUM_INJECTION_GUIDE.md` - Detailed architecture
- `IMPLEMENTATION_CHECKLIST.md` - What to build next
- `MIGRATION_COMPARISON.md` - Why Plasmo is better
- Plasmo Docs: https://docs.plasmo.com

## ✅ You're Ready!

If all tests pass, your Ethereum provider injection is working correctly! 

The foundation is solid. Now you can focus on implementing the actual wallet logic.

Good luck! 🚀

