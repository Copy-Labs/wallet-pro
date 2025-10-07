# 🧪 Testing Guide - Smart Wallet Pro

## ✅ Issues Fixed - Ready to Test!

Both issues have been resolved:
1. ✅ test-dapp.html no longer reloads continuously
2. ✅ Approval popup now shows proper UI

---

## 🚀 Quick Start Testing

### Step 1: Reload Extension
```bash
# Extension is already rebuilt (pnpm dev is running)
# Just reload in Chrome:
# 1. Go to chrome://extensions/
# 2. Find "Smart wallet pro"
# 3. Click the reload icon (circular arrow)
```

### Step 2: Create Account (If You Haven't)
```bash
# Option A: Use Extension Popup
1. Click extension icon in toolbar
2. Go to "Accounts" tab
3. Click "Create Account"
4. Enter name: "Test Account"
5. Click "Create"

# Option B: Use Background Console
1. chrome://extensions/ → Click "service worker"
2. In console:
   const { createSmartAccount } = await import('./services/wallet.js')
   const { mainnet } = await import('viem/chains')
   await createSmartAccount('Test Account', mainnet)
```

### Step 3: Open Test DApp
```bash
# Open test-dapp.html in Chrome
open test-dapp.html
# Or drag the file into Chrome
```

---

## 🎯 Test Scenarios

### Test 1: Wallet Detection (EIP-6963)
**Expected Result:** Smart Wallet Pro appears in detected wallets

**Steps:**
1. Open test-dapp.html
2. Click "🔍 Detect Wallets" button
3. Wait 1 second

**Verify:**
- [ ] "Smart Wallet Pro" appears in wallets list
- [ ] Wallet icon displays
- [ ] Console shows: "Found wallet: Smart Wallet Pro"
- [ ] Console shows: "Total wallets detected: 1" (or more)

**Console Logs:**
```
✅ Detecting wallets using EIP-6963...
✅ Found wallet: Smart Wallet Pro (com.smartwalletpro)
✅ Total wallets detected: 1
```

---

### Test 2: Connection Flow
**Expected Result:** Approval popup opens, can approve, account connects

**Steps:**
1. Click "🔗 Connect Wallet" button
2. Approval popup opens (new window)
3. Review the request details
4. Click "Approve" button

**Verify:**
- [ ] Popup opens (420x600 window)
- [ ] Shows origin (file:// or http://)
- [ ] Shows your account name and address
- [ ] Shows "Connect Wallet" request type
- [ ] Approve/Reject buttons work
- [ ] Popup closes after clicking Approve
- [ ] Account appears in test DApp
- [ ] Status changes to "Connected"

**Console Logs (test-dapp):**
```
✅ Requesting account access...
✅ Connected! Account: 0x1234...5678
```

**Console Logs (background):**
```
✅ [Background] RPC Request: eth_requestAccounts
✅ [Background] Showing approval popup: connect
✅ [Background] Opening approval URL: chrome-extension://[id]/tabs/approval.html
✅ [Background] Approval response received
```

**Console Logs (approval popup):**
```
✅ [Approval] Parsed request: {type: 'connect', origin: '...'}
✅ [Approval] Active account: {name: 'Test Account', address: '0x...'}
✅ [Approval] Sending approval response
```

---

### Test 3: Get Accounts
**Expected Result:** Returns connected account address

**Steps:**
1. Make sure wallet is connected (Test 2)
2. Click "👤 Get Accounts" button

**Verify:**
- [ ] Console shows account address
- [ ] Address matches your account

**Console Logs:**
```
✅ Accounts: ["0x1234...5678"]
```

---

### Test 4: Get Chain ID
**Expected Result:** Returns current chain ID

**Steps:**
1. Click "⛓️ Get Chain ID" button

**Verify:**
- [ ] Console shows chain ID (e.g., "0x1")
- [ ] Shows decimal value (e.g., "1")
- [ ] Network name displays correctly

**Console Logs:**
```
✅ Chain ID: 0x1 (1)
```

---

### Test 5: Sign Message
**Expected Result:** Approval popup opens, can sign message

**Steps:**
1. Make sure wallet is connected
2. Click "✍️ Sign Message" button
3. Approval popup opens
4. Review message: "Hello from Smart Wallet Pro Test DApp!"
5. Click "Approve"

**Verify:**
- [ ] Popup opens with signature request
- [ ] Shows message to sign
- [ ] Shows account info
- [ ] Can approve/reject
- [ ] Returns signature (or error if not implemented yet)

**Console Logs:**
```
✅ Requesting signature for: "Hello from Smart Wallet Pro Test DApp!"
⚠️  Signature: 0x... (or error if signing not connected yet)
```

**Note:** If you get an error, that's expected! The signing service needs to be connected to the background (see NEXT_STEPS_IMPLEMENTATION.md).

---

### Test 6: Send Transaction
**Expected Result:** Approval popup opens with transaction details

**Steps:**
1. Make sure wallet is connected
2. Click "💸 Send Transaction" button
3. Approval popup opens
4. Review transaction details
5. Click "Approve" or "Reject"

**Verify:**
- [ ] Popup opens with transaction request
- [ ] Shows "To" address
- [ ] Shows value (0 ETH in test)
- [ ] Shows account info
- [ ] Can approve/reject

**Console Logs:**
```
✅ Requesting transaction...
⚠️  Transaction sent! Hash: 0x... (or error if not implemented yet)
```

**Note:** If you get an error, that's expected! Transaction sending needs to be fully connected.

---

### Test 7: Event Listeners
**Expected Result:** Events fire when accounts/chain change

**Steps:**
1. Open test-dapp.html
2. Open console
3. Events are already set up

**Verify:**
- [ ] accountsChanged event listener registered
- [ ] chainChanged event listener registered
- [ ] No errors in console

**To Test Events:**
```javascript
// In test-dapp console, manually trigger:
window.ethereum.emit('accountsChanged', ['0xnewaddress'])
// Should log: "Accounts changed: 0xnewaddress"

window.ethereum.emit('chainChanged', '0x89')
// Should log: "Chain changed: 0x89"
// Should update UI (not reload!)
```

---

## 🐛 Troubleshooting

### Test DApp Keeps Reloading
**Status:** ✅ Should be fixed!

**If still happening:**
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear cache
3. Check console for errors

---

### Approval Popup Shows Empty Page
**Status:** ✅ Should be fixed!

**If still happening:**
1. Check background console for URL being opened
2. Verify tabs/approval.html exists:
   ```bash
   ls build/chrome-mv3-dev/tabs/approval.html
   ```
3. Rebuild: Stop pnpm dev (Ctrl+C) and run `pnpm dev` again
4. Reload extension

---

### "No account available" Error
**Solution:** Create an account first (see Step 2 above)

---

### Signature/Transaction Fails
**Expected!** The signing service needs to be connected to background.

**Next Step:** See `NEXT_STEPS_IMPLEMENTATION.md` for how to connect signing service.

---

## 📊 Test Results Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] test-dapp.html loads without reloading
- [ ] Can click all buttons
- [ ] window.ethereum is defined
- [ ] window.ethereum.isSmartWalletPro is true

### EIP-6963 Detection
- [ ] Wallet detection works
- [ ] Smart Wallet Pro appears in list
- [ ] Wallet icon displays
- [ ] Can select wallet

### Connection Flow
- [ ] Approval popup opens
- [ ] Popup shows proper UI
- [ ] Can approve connection
- [ ] Can reject connection
- [ ] Popup closes after action
- [ ] Account connects successfully

### RPC Methods
- [ ] eth_accounts works
- [ ] eth_chainId works
- [ ] eth_requestAccounts works (with approval)
- [ ] personal_sign opens approval (may fail at signing)
- [ ] eth_sendTransaction opens approval (may fail at sending)

### Events
- [ ] accountsChanged listener works
- [ ] chainChanged listener works
- [ ] No page reload on chain change

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ test-dapp.html loads and stays stable
2. ✅ "Detect Wallets" shows Smart Wallet Pro
3. ✅ "Connect Wallet" opens approval popup
4. ✅ Approval popup shows proper UI
5. ✅ Can approve/reject in popup
6. ✅ Account connects after approval
7. ✅ "Get Accounts" returns your address
8. ✅ "Get Chain ID" returns correct chain
9. ✅ No console errors (except expected signing errors)

---

## 📝 What to Test Next

After verifying the above:

1. **Test with Real DApps**
   - Uniswap: https://app.uniswap.org
   - OpenSea: https://testnets.opensea.io
   - WalletConnect: https://react-app.walletconnect.com

2. **Connect Signing Service**
   - See `NEXT_STEPS_IMPLEMENTATION.md`
   - Update background methods
   - Test actual signing

3. **Test Multi-Wallet**
   - Install MetaMask or another wallet
   - Test wallet selector
   - Verify preference storage

---

## 🆘 Need Help?

### Check Logs
1. **Page Console:** F12 → Console (on test-dapp.html)
2. **Background Console:** chrome://extensions/ → "service worker"
3. **Approval Console:** F12 on approval popup window

### Check Files
- `FIXES_ISSUE_1_AND_2.md` - Details on fixes applied
- `TROUBLESHOOTING.md` - Common issues
- `WALLET_IMPLEMENTATION_COMPLETE.md` - Full guide
- `NEXT_STEPS_IMPLEMENTATION.md` - What to do next

---

## ✅ Ready to Test!

```bash
# 1. Extension is rebuilt (pnpm dev running)
# 2. Reload extension in chrome://extensions/
# 3. Open test-dapp.html
# 4. Start testing! 🚀
```

**Both issues are fixed - you should now be able to test the full connection flow!** 🎊

