# Chrome Web Store Submission Package

## 📦 Submission Overview

This directory contains all assets required for submitting Smart Wallet Pro to the Chrome Web Store.

## 📋 Required Files for Submission

### Core Files
- `icon-128x128.png` - 128x128 main icon (also in `/assets/icon.png`)
- `screenshots/` - 3-5 screenshots showing the extension in action
- `manifest.json` - Extension manifest (generated in build)
- Extension ZIP file - Production build from `/build/chrome-mv3-prod/`

### Text Assets
- `store-description.md` - Complete store description
- `detailed-description.md` - Technical feature details
- `privacy-policy-url.txt` - Link to privacy policy
- `terms-of-service-url.txt` - Link to terms of service

## 🛠️ Steps for Chrome Web Store Submission

### 1. Prepare Your Developer Account
- Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
- Pay one-time $5 developer registration fee
- Verify your account

### 2. Create New Item
- Click "Add a new item" in developer dashboard
- Upload the extension ZIP file from `build/chrome-mv3-prod/`

### 3. Fill Store Listing Details

#### Basic Info
- **Name**: Smart Wallet Pro
- **Description**: [Copy from `store-description.md`]
- **Detailed Description**: [Copy from `detailed-description.md`]
- **Category**: Productivity (or Finance if available)
- **Language**: English

#### Images
- **Icon**: Upload `icon-128x128.png`
- **Screenshots**: Upload 3-5 screenshots from `screenshots/` folder
  - Minimum 1280x800 pixels
  - Maximum 5 screenshots

#### Additional Settings
- **Website**: [Your project website URL]
- **Privacy Policy**: [URL from `privacy-policy-url.txt`]
- **Terms of Service**: [URL from `terms-of-service-url.txt`]

### 4. Add Permissions Explanation
When submitting, you'll be asked to explain these permissions:

- **tabs**: "Required to detect when users navigate to dApps that use Ethereum"
- **activeTab**: "Allows the extension to inject Ethereum provider on web pages"
- **storage**: "Required to securely store wallet accounts and user preferences"
- **https://*/*, http://*/*": "Access to web pages to detect and connect to decentralized applications"

### 5. Privacy Practices
Set privacy practices in the Chrome Web Store dashboard:
- Does not collect user data: **Yes**
- Data encryption in transit: **Yes**
- Data encryption at rest: **Yes**
- Users can delete their data: **Yes**

### 6. Testing Instructions
Provide these testing instructions to reviewers:

```
Testing Smart Wallet Pro:

1. Install the extension
2. Click extension icon to open popup
3. Create a new account
4. Test sending ETH on a testnet (Sepolia)
5. Try connecting to a dApp at test-dapp.html
6. Verify transaction flow works end-to-end

Test Account: Use a testnet wallet with small amount of test ETH
Test DApp: The included test-dapp.html file demonstrates connection
```

## 📸 Screenshot Guidelines

Screenshots should show:
1. **Main Interface** - Account selection and balance display
2. **Transaction Flow** - Send/receive transaction interface
3. **DApp Connection** - Extension popup during dApp connection
4. **Network Selection** - Available networks/testnets
5. **Settings** - Gas sponsorship and account management

## 🚀 Post-Submission Steps

### During Review (2-3 days)
- Monitor developer dashboard for any issues
- Be prepared to provide additional documentation
- Address any permission concerns

### After Approval
- **Public Beta**: Enable beta testing and distribute to early testers
- **Marketing**: Announce on crypto forums, Twitter, Discord
- **Community Building**: Set up Discord/Telegram for support

### Early Tester Distribution
1. Create a test group with 100 beta testers
2. Share the unpublished extension link
3. Collect feedback through beta testing form
4. Use feedback to improve before public release

## ⚠️ Important Notes

- **Extension ID**: Keep the same ID across submissions for user continuity
- **Version Bumping**: Always increment version in manifest.json for updates
- **Security Review**: Expect additional scrutiny for wallet/extension with financial features
- **Content Policies**: Ensure compliance with Chrome Web Store financial content policies

## 🔗 Useful Links

- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Extension Quality Guidelines](https://developer.chrome.com/docs/webstore/quality-guidelines/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating-to-manifest-v3/)
