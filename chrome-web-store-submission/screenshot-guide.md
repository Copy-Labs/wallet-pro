# Screenshots Preparation Guide

## 📸 Required Screenshots (3-5 minimum)

Create screenshots that showcase the extension's key features and user flow. All screenshots must be at least 1280x800 pixels.

### Screenshot 1: Main Interface (1280x800 minimum)
- Show the extension popup open
- Display an account with ETH balance
- Tabs: Accounts, Networks, Settings should be visible
- **Filename**: `main-interface.png`

### Screenshot 2: Transaction Flow (1280x800 minimum)
- Show the transaction interface
- Display send/receive options
- If possible, show gas estimation
- **Filename**: `transaction-flow.png`

### Screenshot 3: DApp Connection (1280x800 minimum)
- Show extension popup during dApp connection
- Display account selection for dApp
- Show approval/confirmation interface
- **Filename**: `dapp-connection.png`

### Screenshot 4: Network Selection (optional, 1280x800 minimum)
- Show network switcher interface
- Display available networks
- **Filename**: `network-selection.png`

### Screenshot 5: Settings & Gas Sponsorship (optional, 1280x800 minimum)
- Show settings tab
- Display gas sponsorship options
- Show account management
- **Filename**: `settings-interface.png`

## 🎨 Screenshot Tips

### Technical Requirements
- **Resolution**: Minimum 1280x800 pixels, maximum 1600x900
- **Format**: PNG or JPEG
- **Background**: Clean, neutral background
- **Language**: English text only
- **Branding**: Include extension branding

### Visual Guidelines
- **Browser Frame**: Include Chrome browser frame to show it's an extension
- **Content**: Use testnet data only (no real funds)
- **Clarity**: Ensure text is readable at thumbnail size
- **Focus**: Highlight key features clearly
- **Consistency**: Use similar styling across screenshots

### Content Guidelines
- **Test Data Only**: Never show real wallet addresses or balances
- **Demo Accounts**: Use clearly marked demo/test accounts
- **Privacy**: Blur or remove any personal information
- **Legal**: Do not show copyrighted content or trademarks

## 🛠️ How to Create Screenshots

### Browser Setup
1. Open Chrome and install the extension locally
2. Set browser window to 1280x800 minimum
3. Enable developer mode for unpacked extensions
4. Use Chrome's device toolbar for consistent sizing

### Chrome Extension Screenshots
1. Click extension icon to open popup
2. Use Command+Shift+4 (Mac) or Snipping Tool (Windows) to capture
3. Include browser chrome to show context
4. Edit in image editor to add annotations if needed

### Test Environment
- Use Sepolia testnet for all transactions
- Create test accounts with fake balances
- Use local test dApp for connection demos
- Disable real wallet connections during screenshots

## 📁 File Organization

```
chrome-web-store-submission/
├── screenshots/
│   ├── main-interface.png
│   ├── transaction-flow.png
│   ├── dapp-connection.png
│   ├── network-selection.png (optional)
│   └── settings-interface.png (optional)
├── store-description.md
└── README.md
```

## ✅ Quality Checklist

Before uploading to Chrome Web Store:
- [ ] All screenshots are at least 1280x800 pixels
- [ ] No real addresses, balances, or personal data shown
- [ ] Text is legible in small thumbnails
- [ ] Consistent branding and styling
- [ ] Extensions clearly identifiable as chrome extension
- [ ] Features are accurately represented
- [ ] No copyrighted material included
- [ ] File names are descriptive and professional
