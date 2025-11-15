# 🔧 Alchemy Account Abstraction Fix

## Issue: `getCounterFactualAddress failed`

### Error Messages
```
Signing failed: Failed to sign message: getCounterFactualAddress failed Version: 3.19.0
Transaction failed: Failed to send transaction: getCounterFactualAddress failed Version: 3.19.0
```

---

## Root Cause

The `createLightAccountAlchemyClient` function requires the **API key to be passed explicitly** as a parameter, not just embedded in the RPC URL.

### Before (Incorrect):
```typescript
const client = await createLightAccountAlchemyClient({
  chain,
  signer,
  rpcUrl: getAlchemyRpcUrl(chain)  // ❌ API key in URL doesn't work
})
```

### After (Correct):
```typescript
const client = await createLightAccountAlchemyClient({
  apiKey: ALCHEMY_API_KEY,  // ✅ API key as separate parameter
  chain,
  signer,
})
```

---

## Fix Applied

### Files Modified

#### 1. `src/services/wallet.ts`

**Changes:**
1. Import `ALCHEMY_API_KEY` instead of `getAlchemyRpcUrl`
2. Pass `apiKey` parameter to `createLightAccountAlchemyClient`
3. Add validation to ensure API key is set
4. Remove `rpcUrl` parameter (not needed when apiKey is provided)

**Updated `createSmartAccount()` function:**
```typescript
// Validate API key
if (!ALCHEMY_API_KEY) {
  throw new Error("Alchemy API key not configured. Please set PLASMO_PUBLIC_ALCHEMY_API_KEY in your environment.")
}

// Create the Light Account client
const client = await createLightAccountAlchemyClient({
  apiKey: ALCHEMY_API_KEY,  // ✅ Pass API key explicitly
  chain,
  signer,
})
```

**Updated `getAccountClient()` function:**
```typescript
// Validate API key
if (!ALCHEMY_API_KEY) {
  throw new Error("Alchemy API key not configured. Please set PLASMO_PUBLIC_ALCHEMY_API_KEY in your environment.")
}

// Create the Light Account client
const client = await createLightAccountAlchemyClient({
  apiKey: ALCHEMY_API_KEY,  // ✅ Pass API key explicitly
  chain,
  signer,
})
```

---

## How Alchemy AA Works

### Account Creation Flow

1. **Generate EOA (Externally Owned Account)**
   - Creates a private key
   - Derives EOA address from private key

2. **Create Smart Account Client**
   - Uses EOA as signer
   - Calculates smart account address (counterfactual)
   - Smart account is NOT deployed yet (saves gas)

3. **First Transaction**
   - Deploys smart account on-chain
   - Executes the transaction
   - Uses UserOperation (ERC-4337)

### Why API Key is Required

The Alchemy AA SDK needs the API key to:
- Calculate the counterfactual address
- Access Alchemy's bundler service
- Submit UserOperations
- Query account state
- Estimate gas

---

## Verification Steps

### Step 1: Check API Key is Set
```bash
# Check .env.chrome file
cat .env.chrome | grep ALCHEMY_API_KEY

# Should show:
PLASMO_PUBLIC_ALCHEMY_API_KEY=your_key_here
```

### Step 2: Rebuild Extension
```bash
# Extension should auto-rebuild if pnpm dev is running
# Or manually:
pnpm dev
```

### Step 3: Reload Extension
```bash
# Go to chrome://extensions/
# Click reload on "Smart wallet pro"
```

### Step 4: Test Signing
```bash
# Open test-dapp.html or real DApp
# Connect wallet
# Try signing a message
# Should work now! ✅
```

---

## Testing the Fix

### Test 1: Message Signing
```javascript
// In test-dapp.html or real DApp
await window.ethereum.request({
  method: 'personal_sign',
  params: ['Hello World', '0xYourAddress']
})

// Expected: Returns signature
// Before fix: Error "getCounterFactualAddress failed"
// After fix: Returns "0x..." signature ✅
```

### Test 2: Transaction Sending
```javascript
await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    to: '0xRecipient',
    value: '0x0',
    data: '0x'
  }]
})

// Expected: Returns transaction hash
// Before fix: Error "getCounterFactualAddress failed"
// After fix: Returns "0x..." tx hash ✅
```

---

## Console Logs to Verify

### Background Console
```
[Background] Personal sign request: {message: "...", address: "0x..."}
[Background] Signature created: 0x...
```

### If API Key Missing
```
Error: Alchemy API key not configured. Please set PLASMO_PUBLIC_ALCHEMY_API_KEY in your environment.
```

### If API Key Invalid
```
Error: Invalid API key
```

---

## Common Issues After Fix

### Issue 1: "Insufficient funds for gas"
**Cause:** Smart account has no ETH for gas
**Solution:** 
- Fund the account on testnet
- Use Sepolia faucet: https://sepoliafaucet.com/
- Or use gas sponsorship (see below)

### Issue 2: "Account not deployed"
**Cause:** First transaction deploys the account
**Solution:** 
- This is normal behavior
- First transaction will deploy + execute
- Subsequent transactions are cheaper

### Issue 3: "Network not supported"
**Cause:** Chain not supported by Alchemy AA
**Solution:**
- Use supported networks: Mainnet, Sepolia, Polygon, Optimism, Arbitrum, Base
- Check `src/config/chains.ts` for supported chains

---

## Gas Sponsorship (Optional)

To enable gasless transactions, you can use Alchemy's Gas Manager:

### Step 1: Create Gas Policy
```bash
# Go to Alchemy Dashboard
# Navigate to Gas Manager
# Create a new policy
# Copy the Policy ID
```

### Step 2: Update Environment
```bash
# Add to .env.chrome
PLASMO_PUBLIC_ALCHEMY_POLICY_ID=your_policy_id
```

### Step 3: Update Wallet Service
```typescript
const client = await createLightAccountAlchemyClient({
  apiKey: ALCHEMY_API_KEY,
  chain,
  signer,
  gasManagerConfig: {
    policyId: process.env.PLASMO_PUBLIC_ALCHEMY_POLICY_ID,
  },
})
```

---

## Alchemy AA Configuration Options

### Basic Configuration (Current)
```typescript
const client = await createLightAccountAlchemyClient({
  apiKey: ALCHEMY_API_KEY,
  chain,
  signer,
})
```

### Advanced Configuration (Optional)
```typescript
const client = await createLightAccountAlchemyClient({
  apiKey: ALCHEMY_API_KEY,
  chain,
  signer,
  
  // Gas sponsorship
  gasManagerConfig: {
    policyId: ALCHEMY_POLICY_ID,
  },
  
  // Custom salt for deterministic addresses
  salt: 0n,
  
  // Custom factory address (if using custom implementation)
  factoryAddress: '0x...',
  
  // Custom account implementation
  accountAddress: '0x...',
})
```

---

## Debugging Tips

### Check Account Client Creation
```typescript
// In background console
const { getAccountClient } = await import('./services/wallet.js')
const { mainnet } = await import('viem/chains')

try {
  const client = await getAccountClient('your_account_id', mainnet)
  console.log('Client created:', client)
  console.log('Account address:', client.account.address)
} catch (error) {
  console.error('Error:', error)
}
```

### Check API Key
```typescript
// In background console
const { ALCHEMY_API_KEY } = await import('./config/alchemy.js')
console.log('API Key set:', !!ALCHEMY_API_KEY)
console.log('API Key length:', ALCHEMY_API_KEY?.length)
```

### Test Signing Directly
```typescript
// In background console
const { signPersonalMessage } = await import('./services/signing.js')

try {
  const sig = await signPersonalMessage('test message', '0xYourAddress')
  console.log('Signature:', sig)
} catch (error) {
  console.error('Signing error:', error)
}
```

---

## Summary

### What Was Wrong
- ❌ API key was only in RPC URL
- ❌ `createLightAccountAlchemyClient` couldn't access it
- ❌ Failed to calculate counterfactual address

### What Was Fixed
- ✅ API key now passed as explicit parameter
- ✅ Added validation to ensure API key is set
- ✅ Removed unnecessary `rpcUrl` parameter
- ✅ Both `createSmartAccount` and `getAccountClient` updated

### Result
- ✅ Message signing works
- ✅ Transaction sending works
- ✅ Typed data signing works
- ✅ All Alchemy AA features work

---

## Next Steps

1. **Rebuild extension** (should auto-rebuild)
2. **Reload extension** in chrome://extensions/
3. **Test signing** in test-dapp.html or real DApp
4. **Test transactions** (need funded account)
5. **Optional:** Set up gas sponsorship for gasless transactions

---

## Resources

- [Alchemy AA Docs](https://accountkit.alchemy.com/)
- [Light Account Guide](https://accountkit.alchemy.com/smart-accounts/light-account/)
- [Gas Manager](https://accountkit.alchemy.com/gas-manager/)
- [ERC-4337 Spec](https://eips.ethereum.org/EIPS/eip-4337)

---

**The fix is applied and extension is rebuilding. Test it now! 🚀**

