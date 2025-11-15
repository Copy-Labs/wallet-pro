# Plasmo Ethereum Provider Injection Guide

## Overview

This guide explains how to properly inject an Ethereum provider in a Plasmo-based browser extension, adapting the traditional Rabby wallet approach to work with Plasmo's architecture.

## Key Differences: Traditional vs Plasmo

### Traditional Approach (Rabby Wallet)
```
Content Script (ISOLATED) 
  → Manually injects <script> tag
    → Script runs in MAIN world
      → Creates window.ethereum
```

### Plasmo Approach
```
Content Script (MAIN world) - inpage.ts
  → Plasmo automatically injects into MAIN world
    → Creates window.ethereum

Content Script (ISOLATED world) - index.ts
  → Bridges communication
    → Connects to background
```

## Architecture

### 1. **MAIN World Script** (`src/contents/inpage.ts`)
- **Purpose**: Runs in the page's JavaScript context
- **Access**: Can modify `window.ethereum`
- **Configuration**: Uses `world: "MAIN"` in PlasmoCSConfig
- **Responsibilities**:
  - Create EthereumProvider instance
  - Set up BroadcastChannel communication
  - Inject provider into window.ethereum
  - Handle EIP-6963 multi-wallet support

### 2. **ISOLATED World Script** (`src/content/index.ts`)
- **Purpose**: Bridges communication between page and background
- **Access**: Can communicate with background service worker
- **Configuration**: Default ISOLATED world
- **Responsibilities**:
  - Listen to BroadcastChannel from MAIN world
  - Forward requests to background via chrome.runtime.connect
  - Forward responses back to MAIN world

### 3. **Background Service Worker** (`src/background/index.ts`)
- **Purpose**: Handles RPC requests and wallet logic
- **Responsibilities**:
  - Process Ethereum RPC methods
  - Manage wallet state
  - Handle user approvals
  - Forward read-only requests to RPC providers

## File Structure

```
src/
├── contents/
│   └── inpage.ts              # MAIN world - Provider injection
├── content/
│   └── index.ts               # ISOLATED world - Bridge
├── page-provider/
│   ├── EthereumProvider.ts    # EIP-1193 provider implementation
│   ├── communication.ts       # BroadcastChannel bridge
│   └── eip6963.ts            # Multi-wallet support
├── background/
│   └── index.ts              # Background service worker
└── popup.tsx                 # Extension popup UI
```

## Why This Approach Works with Plasmo

### 1. **No Manual Script Injection**
Plasmo handles script injection automatically based on the `world` config. This is more reliable and follows browser extension best practices.

### 2. **Proper Content Script Separation**
- **MAIN world**: Has access to page's window object
- **ISOLATED world**: Has access to extension APIs
- They communicate via BroadcastChannel (secure cross-context messaging)

### 3. **TypeScript Support**
Plasmo bundles TypeScript properly for both worlds, maintaining type safety.

### 4. **No Web Accessible Resources Needed**
Traditional approach requires declaring scripts in `web_accessible_resources`. Plasmo's MAIN world injection doesn't need this.

## Communication Flow

```
DApp (window.ethereum.request())
  ↓
EthereumProvider (MAIN world)
  ↓
BroadcastChannel
  ↓
Content Script Bridge (ISOLATED world)
  ↓
chrome.runtime.Port
  ↓
Background Service Worker
  ↓
Process Request / Show Approval UI
  ↓
Response flows back up the chain
```

## Key Configuration

### MAIN World Script Config
```typescript
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",              // Critical: Inject into page context
  run_at: "document_start",   // Run before page scripts
  all_frames: false           // Only main frame
}
```

### ISOLATED World Script Config
```typescript
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: false
  // world defaults to "ISOLATED"
}
```

## Important Notes

### 1. **Import Resolution in MAIN World**
The MAIN world script has limited access to extension resources. Plasmo bundles everything together, but be aware:
- Use `~` path alias for imports (configured in tsconfig.json)
- All dependencies are bundled into the script
- No access to chrome.* APIs in MAIN world

### 2. **BroadcastChannel Security**
BroadcastChannel is used for MAIN ↔ ISOLATED communication:
- Same-origin only (secure)
- Doesn't expose extension internals to page
- Fast and reliable

### 3. **Multiple Content Scripts**
Plasmo supports multiple content scripts:
- Files in `src/contents/` directory are auto-discovered
- Each can have its own config
- They run independently

### 4. **EIP-6963 Support**
The implementation includes EIP-6963 for multi-wallet support:
- Allows coexistence with MetaMask, Rabby, etc.
- DApps can discover and choose wallets
- Better UX for users with multiple wallets

## Testing

### 1. **Build the Extension**
```bash
pnpm dev
```

### 2. **Load in Browser**
- Chrome: Load `build/chrome-mv3-dev`
- Check console for injection logs

### 3. **Test on a DApp**
```javascript
// In browser console on any webpage
console.log(window.ethereum)
// Should show your provider

await window.ethereum.request({ method: 'eth_requestAccounts' })
// Should trigger your wallet
```

### 4. **Check Communication**
Look for these console logs:
- `[Inpage] Starting Smart Wallet Pro injection...`
- `[Content Script] Initializing bridge...`
- `[Background] Content script connected`

## Troubleshooting

### Provider Not Injected
- Check that both content scripts are loaded
- Verify `world: "MAIN"` in inpage.ts config
- Check browser console for errors

### Communication Timeout
- Verify BroadcastChannel name matches in both scripts
- Check background service worker is running
- Look for port connection errors

### Multiple Wallets Conflict
- Ensure unique `rdns` in EIP-6963 setup
- Check injection order (document_start helps)
- Test with other wallets disabled

## Advantages Over Traditional Approach

1. **Cleaner Architecture**: No manual DOM manipulation
2. **Better TypeScript Support**: Plasmo handles bundling
3. **Automatic Manifest Generation**: Less configuration
4. **Hot Reload**: Faster development iteration
5. **Framework Agnostic**: Works with React, Vue, Svelte
6. **Built-in Optimizations**: Code splitting, tree shaking

## Migration from Traditional Setup

If migrating from a webpack-based setup:

1. **Remove manual script injection code**
2. **Split content script into MAIN and ISOLATED**
3. **Update imports to use Plasmo's `~` alias**
4. **Remove web_accessible_resources for provider script**
5. **Add PlasmoCSConfig exports**
6. **Test thoroughly**

## Next Steps

1. Implement actual wallet logic in background service worker
2. Add approval UI for transactions and signatures
3. Implement proper state management
4. Add RPC provider integration
5. Test with popular DApps (Uniswap, OpenSea, etc.)

## Resources

- [Plasmo Content Scripts Docs](https://docs.plasmo.com/framework/content-scripts)
- [EIP-1193: Ethereum Provider API](https://eips.ethereum.org/EIPS/eip-1193)
- [EIP-6963: Multi Injector Provider Discovery](https://eips.ethereum.org/EIPS/eip-6963)
- [Chrome Extension Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

