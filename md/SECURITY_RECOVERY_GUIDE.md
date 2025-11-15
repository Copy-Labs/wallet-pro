# 🔐 Security & Recovery Features Guide

Complete guide to Smart Wallet Pro's security and recovery features.

---

## 📋 Table of Contents

1. [Password Protection](#password-protection)
2. [Private Key Encryption](#private-key-encryption)
3. [Session Management & Auto-Lock](#session-management--auto-lock)
4. [Seed Phrase Backup](#seed-phrase-backup)
5. [Account Recovery](#account-recovery)
6. [Export & Import](#export--import)
7. [Security Best Practices](#security-best-practices)

---

## 🔐 Password Protection

### Features

- ✅ **Strong Password Requirements**
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

- ✅ **Password Strength Indicator**
  - Real-time validation
  - Visual strength meter (weak/medium/strong)
  - Instant feedback on requirements

- ✅ **Secure Password Hashing**
  - PBKDF2 with 100,000 iterations
  - SHA-256 hash function
  - Random salt per password
  - Constant-time comparison

### Usage

#### First-Time Setup
1. Open extension
2. Navigate to `/tabs/setup-password.html`
3. Enter strong password
4. Confirm password
5. Click "Create Password"

#### Change Password
```typescript
import { changePassword } from '~services/security'

await changePassword(oldPassword, newPassword)
```

---

## 🔒 Private Key Encryption

### Features

- ✅ **AES-256-GCM Encryption**
  - Industry-standard encryption
  - Authenticated encryption
  - 256-bit key length

- ✅ **Key Derivation**
  - PBKDF2 with 100,000 iterations
  - Unique salt per encryption
  - Unique IV per encryption

- ✅ **Secure Storage**
  - Encrypted private keys in chrome.storage.local
  - Never stored in plaintext
  - Decrypted only when needed

### Implementation

```typescript
import { encryptWithPassword, decryptWithPassword } from '~services/encryption'

// Encrypt private key
const encrypted = await encryptWithPassword(privateKey, password)

// Decrypt private key
const decrypted = await decryptWithPassword(encrypted, password)
```

---

## ⏱️ Session Management & Auto-Lock

### Features

- ✅ **Automatic Locking**
  - Default timeout: 5 minutes
  - Configurable timeout
  - Activity tracking

- ✅ **Manual Lock**
  - Lock wallet anytime
  - Requires password to unlock

- ✅ **Failed Attempt Protection**
  - Tracks failed unlock attempts
  - 60-second lockout after 5 failed attempts
  - Prevents brute-force attacks

### Configuration

```typescript
import { setAutoLockTimeout, lockWallet, unlockWallet } from '~services/security'

// Set auto-lock timeout (in milliseconds)
await setAutoLockTimeout(10 * 60 * 1000) // 10 minutes

// Manual lock
await lockWallet()

// Unlock
await unlockWallet(password)
```

### Auto-Lock Behavior

- **Triggers**:
  - Inactivity for configured duration
  - Browser close (optional)
  - Manual lock

- **Activity Reset**:
  - Any RPC request
  - Any wallet interaction
  - Signing operations
  - Transaction sending

- **Public Methods** (No Lock Required):
  - `eth_chainId`
  - `eth_blockNumber`
  - `eth_call`
  - `eth_getBalance`
  - Other read-only methods

---

## 🔑 Seed Phrase Backup

### Features

- ✅ **BIP-39 Mnemonic**
  - 12-word seed phrase
  - Industry-standard format
  - Compatible with other wallets

- ✅ **Encrypted Storage**
  - Seed phrase encrypted with password
  - Stored securely in chrome.storage.local

- ✅ **Verification Flow**
  - Display seed phrase
  - User confirms by entering random words
  - Ensures user has saved it

- ✅ **Derivation**
  - BIP-44 derivation path: `m/44'/60'/0'/0/index`
  - Multiple accounts from one seed
  - Deterministic address generation

### Usage

#### Generate & Backup
1. Navigate to `/tabs/backup-seed.html`
2. Enter password
3. View 12-word seed phrase
4. Write it down securely
5. Verify by entering random words

#### Programmatic Access
```typescript
import { generateSeedPhrase, saveSeedPhrase, getSeedPhrase } from '~services/recovery'

// Generate new seed phrase
const mnemonic = generateSeedPhrase()

// Save encrypted
await saveSeedPhrase(mnemonic, password)

// Retrieve
const retrieved = await getSeedPhrase(password)
```

---

## 🔄 Account Recovery

### Features

- ✅ **Seed Phrase Recovery**
  - Restore wallet from 12-word phrase
  - Validates mnemonic before recovery
  - Derives accounts automatically

- ✅ **Backup File Recovery**
  - Import from encrypted backup file
  - JSON format
  - Password-protected

### Recovery Methods

#### Method 1: Seed Phrase
1. Navigate to `/tabs/recover.html`
2. Select "Seed Phrase"
3. Enter 12-word seed phrase
4. Create new password
5. Wallet recovered!

#### Method 2: Backup File
1. Navigate to `/tabs/recover.html`
2. Select "Backup File"
3. Choose backup JSON file
4. Enter backup password
5. Wallet restored!

### Programmatic Recovery

```typescript
import { recoverFromSeedPhrase, deriveAccountsFromSeed } from '~services/recovery'

// Recover from seed phrase
await recoverFromSeedPhrase(mnemonic, password, accountCount)

// Derive specific accounts
const accounts = deriveAccountsFromSeed(mnemonic, 3, 0)
// Returns: [{ privateKey, address, index }, ...]
```

---

## 💾 Export & Import

### Features

- ✅ **Full Wallet Export**
  - All accounts
  - All settings
  - Encrypted with password

- ✅ **Portable Format**
  - JSON file
  - Version tracking
  - Timestamp included

- ✅ **Secure Import**
  - Password verification
  - Format validation
  - Overwrites existing data

### Usage

#### Export Wallet
```typescript
import { exportAccountData, createBackupFile } from '~services/recovery'

// Export encrypted data
const encrypted = await exportAccountData(password)

// Create downloadable file
const blob = createBackupFile(encrypted)

// Download
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `smart-wallet-backup-${Date.now()}.json`
a.click()
```

#### Import Wallet
```typescript
import { parseBackupFile, importAccountData } from '~services/recovery'

// Parse file
const encrypted = await parseBackupFile(file)

// Import data
await importAccountData(encrypted, password)
```

---

## 🛡️ Security Best Practices

### For Users

1. **Password Security**
   - Use a unique, strong password
   - Never share your password
   - Consider using a password manager

2. **Seed Phrase Security**
   - Write it down on paper
   - Store in multiple secure locations
   - Never store digitally (photos, cloud, etc.)
   - Never share with anyone

3. **Backup Strategy**
   - Create backup immediately after setup
   - Test recovery process
   - Store backup file securely
   - Update backup after major changes

4. **Device Security**
   - Keep browser updated
   - Use antivirus software
   - Lock your computer when away
   - Be cautious of phishing

### For Developers

1. **Encryption**
   - Always use Web Crypto API
   - Never roll your own crypto
   - Use authenticated encryption (AES-GCM)
   - Generate random salts and IVs

2. **Key Derivation**
   - Use PBKDF2 with high iteration count
   - Minimum 100,000 iterations
   - Use SHA-256 or stronger

3. **Storage**
   - Never store plaintext private keys
   - Use chrome.storage.local (encrypted)
   - Clear sensitive data from memory
   - Implement secure deletion

4. **Session Management**
   - Implement auto-lock
   - Track user activity
   - Clear session on lock
   - Require re-authentication

---

## 📊 Security Architecture

```
┌─────────────────────────────────────────┐
│           User Password                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  PBKDF2 (100k iterations, SHA-256)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Encryption Key (AES-256)           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Encrypted Private Keys / Seed Phrase  │
│   (Stored in chrome.storage.local)      │
└─────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Auto-Lock Timeout
```typescript
// Default: 5 minutes
const DEFAULT_AUTO_LOCK_TIMEOUT = 5 * 60 * 1000

// Change timeout
await setAutoLockTimeout(10 * 60 * 1000) // 10 minutes
```

### Password Requirements
```typescript
// Minimum length: 8 characters
// Required: uppercase, lowercase, number, special char
const validation = validatePasswordStrength(password)
```

### Encryption Parameters
```typescript
// PBKDF2 iterations: 100,000
// Salt length: 16 bytes (128 bits)
// IV length: 12 bytes (96 bits)
// Key length: 32 bytes (256 bits)
```

---

## 📱 User Flows

### First-Time Setup
1. Install extension
2. Create password → `/tabs/setup-password.html`
3. Create account
4. Backup seed phrase → `/tabs/backup-seed.html`
5. Start using wallet

### Daily Usage
1. Open wallet (auto-unlocks if within timeout)
2. If locked → Enter password → `/tabs/unlock.html`
3. Use wallet normally
4. Auto-locks after 5 minutes of inactivity

### Recovery Scenario
1. Lost access to wallet
2. Navigate to `/tabs/recover.html`
3. Choose recovery method (seed phrase or backup file)
4. Enter credentials
5. Wallet restored

---

## 🎯 Next Steps

### Potential Enhancements

1. **Biometric Authentication**
   - Fingerprint unlock
   - Face ID support
   - WebAuthn integration

2. **Hardware Wallet Support**
   - Ledger integration
   - Trezor integration
   - Secure element usage

3. **Social Recovery**
   - Guardian system
   - Multi-signature recovery
   - Time-locked recovery

4. **Advanced Security**
   - Transaction limits
   - Whitelist addresses
   - Multi-factor authentication

---

**Your wallet is now secured with enterprise-grade encryption and recovery features! 🔐**

