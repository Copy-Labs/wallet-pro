# Smart Wallet Pro - Manual QA Checklist
## Week 6 - Testing + Distribution

### Pre-Release QA Checklist

#### 1. Balance & Account Management Testing
- [ ] **Load extension** - Install and load the unpacked extension in Chrome Developer Mode
- [ ] **Create first account** - Use "Create Account" button, verify account appears in dropdown
- [ ] **Account naming** - Rename account, verify name persists across reloads
- [ ] **Multiple accounts** - Create 2+ accounts, switch between them using dropdown
- [ ] **Account persistence** - Reload extension, verify accounts are saved
- [ ] **Balance display** - Check ETH balance shows correctly (may be 0 for new accounts)
- [ ] **Network switcher** - Verify network dropdown shows available chains

#### 2. Transaction Flow Testing
- [ ] **Send ETH preparation** - Fill recipient address and amount fields
- [ ] **Gas estimation** - Verify gas cost appears when amount entered
- [ ] **Send transaction** - Execute small ETH send to another address (use testnet)
- [ ] **Transaction pending** - Verify "pending" status shows in history
- [ ] **Transaction success** - Wait for transaction to confirm, verify success status
- [ ] **Transaction history** - Verify sent transaction appears in history tab
- [ ] **Receive ETH** - Send ETH to account from external wallet, verify balance updates
- [ ] **Receive transaction** - Verify received transaction appears in history as "receive"

#### 3. Network Testing
- [ ] **Network persistence** - Switch to testnet, reload extension, verify network persists
- [ ] **Cross-network accounts** - Create accounts on different networks
- [ ] **Network-specific balances** - Verify balances show correctly per network
- [ ] **Network-specific addresses** - Note: accounts may have different addresses on different chains

#### 4. DApp Connection Testing
- [ ] **Open test dapp** - Navigate to `test-dapp.html` in browser
- [ ] **Connect request** - Click "Connect" in test dapp, verify popup appears
- [ ] **Approve connection** - Approve connection in popup, verify dapp shows connected
- [ ] **Connection persistence** - Reload dapp page, verify still connected
- [ ] **Transaction request** - Attempt transaction from dapp, verify popup appears
- [ ] **Transaction approval** - Approve transaction, verify executes
- [ ] **Reject connection** - Try connecting from different dapp, reject in popup
- [ ] **Connection isolation** - Verify each dapp connection is separate/independent

#### 5. Security & Isolation Testing
- [ ] **Provider isolation** - Open multiple tabs with different dapps, verify they can't see each other's data
- [ ] **Private key security** - Check console for any private key leaks
- [ ] **Network isolation** - Attempt cross-contract calls between dapps (should fail)
- [ ] **Permission scope** - Verify dapp can only access approved accounts/networks
- [ ] **Session isolation** - Open incognito tab, verify extension is isolated

#### 6. Gas Sponsorship Testing
- [ ] **Sponsorship enabled** - Check settings, verify sponsorship toggle works
- [ ] **Low-cost sponsorship** - Send small amount (<$1), verify sponsorship
- [ ] **High-cost rejection** - Send large amount (>$2), verify user pays gas
- [ ] **Sponsorship threshold** - Test amounts at sponsorship boundary

#### 7. Error Handling Testing
- [ ] **Invalid address** - Attempt send to invalid address, verify error message
- [ ] **Insufficient balance** - Attempt send more than balance, verify error
- [ ] **Network errors** - Disconnect network, attempt transaction, verify graceful failure
- [ ] **API failures** - Mock/test with invalid API keys, verify error handling
- [ ] **Race conditions** - Rapid-fire multiple transactions, verify no conflicts

#### 8. UI/UX Testing
- [ ] **Responsive design** - Test extension popup at different sizes
- [ ] **Theme switching** - Verify light/dark theme toggle works
- [ ] **Loading states** - Verify spinners/toasts during transactions
- [ ] **Error messages** - Verify all error states show user-friendly messages
- [ ] **Toast notifications** - Verify success/failure toasts appear
- [ ] **Form validation** - Test address validation and amount inputs

#### 9. Performance Testing
- [ ] **Load time** - Time extension popup opening (<2 seconds)
- [ ] **Transaction speed** - Test transaction submission/confirmation time
- [ ] **Memory usage** - Monitor extension memory usage during testing
- [ ] **API rate limits** - Rapid API calls, verify no crashes

#### 10. Cross-Browser Compatibility
- [ ] **Chrome MV3** - Primary target, verify works in latest Chrome
- [ ] **Edge compatibility** - Test in Microsoft Edge (same engine)
- [ ] **Firefox** - Test Firefox Manifest V2 compatibility (if supporting)

### Build & Distribution Pre-check

#### Build Testing
- [ ] **Production build** - Run `pnpm build`, verify no errors
- [ ] **Bundle size** - Check build output size (<5MB recommended)
- [ ] **Source maps** - Verify source maps generated but not included in production
- [ ] **Asset integrity** - Verify all icons/images included

#### Chrome Web Store Assets
- [ ] **Extension icon** - 128x128 PNG in assets/icon.png
- [ ] **Screenshots** - 3-5 screenshots: popup, transaction flow, connected dapp
- [ ] **Description** - Compelling description highlighting smart account benefits
- [ ] **Privacy policy** - Link to hosted privacy policy
- [ ] **Terms of service** - Link to hosted terms
- [ ] **Homepage URL** - Link to project website/landing page

#### Post-Submission Testing
- [ ] **Installed version** - Install from Web Store (unpublished), test full flow
- [ ] **Update flow** - Push update, verify auto-update works
- [ ] **Rating/review** - Initial positive review for credibility
- [ ] **Beta channel** - Set up beta testing if needed

### Test Environment Setup

**Required Test Accounts:**
- Test wallet with ETH on Sepolia/Ethereum (for transactions)
- Multiple browser profiles for isolation testing
- Clean Chrome profile for extension testing

**Test Data:**
- Valid recipient addresses
- Known token contracts (for future ERC20 testing)
- Popular dapps: Uniswap, OpenSea, Aave interfaces

**Success Criteria:**
- All manual tests pass without critical bugs
- No console errors or warnings
- Responsive UI across popup sizes (300-500px)
- Transaction success rate >95%
- Load times <3 seconds consistently
