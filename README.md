This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## DApp Connect Testing

The extension now supports DApp connectivity through an injected Ethereum provider with a wallet chooser feature. To test:

### 🛠️ **Step-by-Step Testing**

1. **Build the extension**: `pnpm build`
2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Load unpacked → Select `build/chrome-mv3-prod/`
   - **Very important**: Enable "Allow access to file URLs"
3. **Test locally**:
   - Serve test page: `python -m http.server 8000`
   - Open `http://localhost:8000/test-dapp.html`

### 🔍 **Debugging Features (Latest Version)**

The latest version includes comprehensive debugging:

- **Browser Alerts**: Alert popups when injection starts/succeeds/fails
- **Console Logs**: Detailed injection and message flow logging
- **Test Button**: Red "🔧 Test Smart Wallet Pro Injection" button appears on test page after 1 second
- **Multiple Injection Attempts**: Backup injections with delays to handle race conditions

**What to look for:**
- **Alert popup**: "Smart Wallet Pro: Starting injection process!"
- **Console logs** starting with 🟡, 🔍, 💉, ✅ emojis
- **Green test button** in top-right corner of page
- **Wallet chooser overlay** should appear **directly on the DApp page** (like MetaMask)

### Features Implemented

#### Core DApp Connectivity
- ✅ Inject `window.ethereum` provider for DApps (always overrides MetaMask)
- ✅ Handle `eth_requestAccounts` (account connection via overlay)
- ✅ Handle `eth_sendTransaction` (transaction approval in popup)
- ✅ Gas sponsorship detection (< $1 threshold)
- ✅ Domain-specific permissions storage
- ✅ Persistent account connections per DApp

#### Content Script Overlay (MetaMask-Style)
- ✅ **Wallet chooser appears directly on DApp page** (not in extension popup)
- ✅ **Always overrides** other wallets (MetaMask, Coinbase, etc.)
- ✅ **Seamless UX** - no need to manage browser extension settings
- ✅ **Fallback handling** - rejects requests for other wallets
- ✅ **Permission persistence** - remembers choices per domain

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
