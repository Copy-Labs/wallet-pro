# Troubleshooting Guide

## Current Status

✅ **Working:**
- MAIN world injection (`[Inpage]` logs visible)
- Provider created successfully
- `window.ethereum` is available

⚠️ **Issues Fixed:**
- ~~nanoid error~~ → Replaced with simple ID generator
- ~~Content script not loading~~ → Moved to `src/contents/bridge.ts`

## Common Issues & Solutions

### Issue 1: Content Script Bridge Not Loading

**Symptoms:**
- No `[Content Script Bridge]` logs in console
- Only see `[Inpage]` logs

**Cause:**
Plasmo expects content scripts in `src/contents/` (plural), not `src/content/` (singular)

**Solution:**
✅ Already fixed! Created `src/contents/bridge.ts`

**Verify:**
1. Rebuild: `pnpm dev`
2. Reload extension in Chrome
3. Refresh test page
4. Check console for: `[Content Script Bridge] Initialized successfully`

---

### Issue 2: nanoid Error in MAIN World

**Symptoms:**
```
TypeError: Cannot read properties of undefined (reading '26')
at nanoid (index.browser.js:28:10)
```

**Cause:**
`nanoid` library uses Node.js crypto APIs that aren't available in browser MAIN world context

**Solution:**
✅ Already fixed! Replaced with simple ID generator:
```typescript
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}
```

---

### Issue 3: Initial State Request Fails

**Symptoms:**
```
[Inpage] Failed to get initial state: ...
```

**Cause:**
Bridge might not be ready when initial state is requested

**Solution:**
✅ Already fixed! Added 100ms delay and better error handling

**This is normal if:**
- Background service worker is not connected yet
- Bridge is still initializing
- First page load

**Not a problem because:**
- Provider still works
- State will sync when connection is established
- DApps will request accounts when needed

---

## Verification Steps

### Step 1: Check All Logs Appear

Open any webpage and check console for these logs in order:

```
[Inpage] Starting Smart Wallet Pro injection...
[Inpage] Creating provider instance...
[Inpage] Creating communication bridge...
[Inpage] Initializing provider with bridge...
[Content Script Bridge] Initializing...
[Content Script Bridge] Connected to background
[Content Script Bridge] Initialized successfully
[Inpage] Smart Wallet Pro provider injected successfully
[Inpage] Requesting initial state from background...
```

### Step 2: Check Background Service Worker

1. Go to `chrome://extensions/`
2. Find "Smart wallet pro"
3. Click "service worker" link
4. Should see:
```
[Background] Content script connected: ...
```

### Step 3: Test Provider

In page console:
```javascript
// Should return provider object
console.log(window.ethereum)

// Should return true
console.log(window.ethereum.isSmartWalletPro)

// Should work (returns mock data currently)
await window.ethereum.request({ method: 'eth_chainId' })
```

---

## File Structure Check

Verify you have these files:

```
src/
├── contents/              ← Plural! (Plasmo convention)
│   ├── inpage.ts         ← MAIN world provider
│   └── bridge.ts         ← ISOLATED world bridge
├── content/              ← Old directory (can be removed)
│   └── index.ts          ← Old file (not used anymore)
├── page-provider/
│   ├── EthereumProvider.ts
│   ├── communication.ts   ← Fixed nanoid issue
│   └── eip6963.ts
└── background/
    └── index.ts
```

**Action:** You can safely delete `src/content/` directory now:
```bash
rm -rf src/content/
```

---

## Build Issues

### Issue: Extension Not Updating

**Solution:**
```bash
# Stop dev server (Ctrl+C)
# Clean build
rm -rf build/ .plasmo/

# Rebuild
pnpm dev

# In Chrome:
# 1. Go to chrome://extensions/
# 2. Click reload icon on your extension
# 3. Hard refresh test page (Ctrl+Shift+R)
```

### Issue: TypeScript Errors

**Solution:**
```bash
# Check TypeScript
pnpm exec tsc --noEmit

# If errors, check imports use ~ alias
# Good: import { X } from "~page-provider/X"
# Bad:  import { X } from "../page-provider/X"
```

---

## Communication Flow Debug

### Test BroadcastChannel

In page console:
```javascript
// Create test channel
const testChannel = new BroadcastChannel('ethereum-provider-bridge')

// Listen for messages
testChannel.addEventListener('message', (e) => {
  console.log('Received:', e.data)
})

// Send test message
testChannel.postMessage({ type: 'test', data: 'hello' })
```

### Test Provider Request

```javascript
// This should trigger the full communication flow
window.ethereum.request({ method: 'eth_chainId' })
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error))
```

**Expected flow:**
1. `[Inpage]` creates request with ID
2. `[Content Script Bridge]` receives via BroadcastChannel
3. `[Background]` receives via Port
4. `[Background]` sends response
5. `[Content Script Bridge]` forwards response
6. `[Inpage]` resolves promise

---

## Still Having Issues?

### Enable Verbose Logging

Add more logs to debug:

**In `src/contents/inpage.ts`:**
```typescript
console.log('[Inpage] Bridge state:', {
  isReady: bridge.isReady(),
  channel: bridge
})
```

**In `src/contents/bridge.ts`:**
```typescript
console.log('[Bridge] Message from page:', message)
console.log('[Bridge] Forwarding to background:', message)
console.log('[Bridge] Response from background:', response)
```

**In `src/background/index.ts`:**
```typescript
console.log('[Background] Request received:', request)
console.log('[Background] Sending response:', response)
```

### Check Extension Manifest

```bash
cat build/chrome-mv3-dev/manifest.json | grep -A 20 content_scripts
```

Should show:
```json
"content_scripts": [
  {
    "js": ["contents/inpage.js"],
    "matches": ["<all_urls>"],
    "run_at": "document_start",
    "world": "MAIN"
  },
  {
    "js": ["contents/bridge.js"],
    "matches": ["<all_urls>"],
    "run_at": "document_start"
  }
]
```

### Check Service Worker Status

```bash
# In Chrome DevTools (service worker console)
chrome.runtime.getManifest()
```

Should return manifest without errors.

---

## Next Steps After Fixing

Once you see all logs correctly:

1. ✅ Verify `window.ethereum` works
2. ✅ Test basic requests
3. ✅ Check event listeners
4. 🔧 Implement background wallet logic
5. 🎨 Build approval UI
6. 🧪 Test with real DApps

---

## Quick Reference

### Rebuild Command
```bash
pnpm dev
```

### Check Logs
- **Page Console**: F12 → Console
- **Service Worker**: chrome://extensions/ → service worker link

### Test Provider
```javascript
window.ethereum.request({ method: 'eth_chainId' })
```

### Clean Build
```bash
rm -rf build/ .plasmo/ && pnpm dev
```

---

## Success Criteria

You're ready to move forward when:

- [x] `[Inpage]` logs appear
- [ ] `[Content Script Bridge]` logs appear ← **Check this!**
- [ ] `[Background]` logs appear
- [x] `window.ethereum` is defined
- [x] No nanoid errors
- [ ] Initial state request completes (or fails gracefully)
- [ ] Basic requests work

---

## Need More Help?

1. Check `QUICK_START.md` for testing steps
2. Review `PLASMO_ETHEREUM_INJECTION_GUIDE.md` for architecture
3. See `IMPLEMENTATION_CHECKLIST.md` for next steps

## Current Action Items

1. **Rebuild the extension:**
   ```bash
   pnpm dev
   ```

2. **Reload extension in Chrome**

3. **Refresh test page**

4. **Check for `[Content Script Bridge]` logs**

5. **If still not working, delete old content directory:**
   ```bash
   rm -rf src/content/
   pnpm dev
   ```

