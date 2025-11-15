# Smart Wallet Pro & Alchemy AA: Email/Social Login, MPC, and Backups

This document defines the concrete implementation plan to make the About page claim true:

- Abstract wallet complexity using:
  - Email/social sign-in
  - MPC or cloud-backed keys via Alchemy
  - Smart accounts (AA) with gas sponsorship
  - Opinionated backup/recovery flows
- Integrate cleanly with the existing extension codebase.

## 1. Building Blocks

We will rely on:

- Alchemy Account Kit / AA infra:
  - Smart accounts, EIP-7702 / sponsored calls where supported.
  - Auth + MPC or key management where available (OIDC / passwordless).
- Existing components:
  - `src/services/wallet.ts` — account creation, smart account client, storage.
  - `src/services/transaction.ts` — AA-aware transaction orchestration.
  - `src/background/index.ts` — provider, RPC, permissions, lock.
  - Plasmo storage + tabs for UI (onboarding, unlock, approval).

For code references, we refer to constructs as:
- [`src/services/wallet.ts`](src/services/wallet.ts)
- [`src/services/transaction.ts`](src/services/transaction.ts)
- [`src/background/index.ts`](src/background/index.ts)
- [`src/app/pages/settings/about.tsx`](src/app/pages/settings/about.tsx)

## 2. Auth & Identity: Email / Social via Alchemy

Introduce a dedicated auth service that wraps Alchemy Account Kit (or equivalent Alchemy auth):

- New file: [`src/services/auth.ts`](src/services/auth.ts)

Responsibilities:

- Initialize Alchemy auth client with:
  - `PLASMO_PUBLIC_ALCHEMY_API_KEY`
  - `ALCHEMY_APP_ID` / `ALCHEMY_AUTH_URL` (from env)
- Methods:
  - `initAuthClient()`
  - `signInWithProvider(provider: "email" | "google" | "apple" | ...)`
  - `getCurrentUser(): Promise<AuthUser | null>`
  - `signOut(): Promise<void>`
  - `onAuthStateChange(callback)`
- `AuthUser` shape:
  - `userId: string`
  - `email?: string`
  - `provider: string`
  - `sessionToken: string`
  - `expiresAt: number`

Storage:

- Use `@plasmohq/storage` to persist:
  - `auth_user` (non-sensitive profile + minimal token)
- Do NOT persist raw MPC keys; those stay in Alchemy / MPC infra.

Behavior:

- On browser extension startup:
  - Call `initAuthClient()`
  - Hydrate `auth_user` if session valid.
- On sign-out:
  - Clear `auth_user`, optionally lock wallet and reset active account.

## 3. Linking Auth Users to Wallet Accounts

Extend the wallet layer to associate authenticated identities with smart accounts.

Changes:

1) Extend `WalletAccount` type (in `src/types/account.ts`):

- Add:
  - `accountType?: "local-eip7702" | "imported" | "aa-mpc"`
  - `authUserId?: string` // for "aa-mpc" accounts
  - For `aa-mpc`, avoid exposing `privateKey` if using MPC; instead store an identifier/handle.

2) Add mapping helpers in [`src/services/wallet.ts`](src/services/wallet.ts):

- `linkAuthUserToAccount(userId: string, accountId: string)`
- `getAccountForUser(userId: string): Promise<WalletAccount | null>`

Implementation sketch:

- Store a map in Plasmo storage:
  - key: `auth-user-wallet-links`
  - value: `{ [userId: string]: accountId }`
- On load:
  - If `auth_user` exists:
    - Resolve mapped account and set as active.

3) Creation strategy:

- For `aa-mpc`:
  - Use Account Kit / Alchemy signer instead of `generatePrivateKey`.
  - `createSmartAccountForUser(user: AuthUser): Promise<WalletAccount>`
    - Use Alchemy AA / MPC SDK to derive an address/smart account.
    - Persist as:
      - `accountType: "aa-mpc"`
      - `authUserId: user.userId`
      - `address: <from Alchemy/AA>`
      - No local raw private key field used.
    - Link via `linkAuthUserToAccount`.

## 4. Smart Wallet Client: MPC-aware getAccountClient

Update [`getAccountClient()`](src/services/wallet.ts) to understand `aa-mpc`:

- If `account.accountType === "aa-mpc"`:
  - Initialize Account Kit smart wallet client with:
    - `transport: alchemy({ apiKey: ALCHEMY_API_KEY })`
    - `chain: accountKitChain`
    - `signer: mpcSignerFor(userId)` (Alchemy SDK)
    - `account: account.address`
    - `policyId` for gas sponsorship if set.
- Else:
  - Keep existing `LocalAccountSigner` + EIP-7702 flow.

This ensures:

- Background RPC (`eth_sendTransaction`, etc.) can transparently use AA/MPC accounts via existing `sendTransactionService` and `getAccountClient`.

## 5. UX Flows

### 5.1 Onboarding

Files to extend:

- [`src/tabs/onboarding.tsx`](src/tabs/onboarding.tsx)
- [`src/tabs/setup-password.tsx`](src/tabs/setup-password.tsx)
- Any unlock/entry tab.

New flow:

1) Initial screen:
   - Buttons:
     - "Continue with Email / Social (Recommended)"
     - "Advanced: Use seed phrase / private key"
2) On "Continue with Email / Social":
   - Call `auth.signInWithProvider(...)`.
   - On success:
     - Call `getAccountForUser(user.userId)`.
     - If exists: set active and go to Home.
     - Else:
       - Call `createSmartAccountForUser(user)` (AA/MPC).
       - Set active and go to Home.

This implements the mission: user never sees a seed phrase by default.

### 5.2 Returning User (Same Device)

- On popup open:
  - `auth.getCurrentUser()`:
    - If exists and session valid:
      - `getAccountForUser` → set active.
    - If not:
      - Show unlock or sign-in prompt.
- If you still use a local PIN/password:
  - Keep it as second-factor for unlocking local state if desired.

### 5.3 Returning User (New Device)

- Install extension → Onboarding:
  - "Continue with Email / Social".
  - After Alchemy auth:
    - Re-hydrate MPC share server-side.
    - Find existing mapped account (by `userId`) via `getAccountForUser`.
    - Load their AA account.
  - No seed phrase required.

## 6. Backup & Recovery Model

Align with “wallet backups” powered by login:

Layers:

1) Primary backup: Auth-based + MPC
   - The user’s email/social login (with Alchemy) is the main recovery path.
   - Document clearly in UI:
     - “Lose your device? Reinstall and sign in with the same email/social to restore your wallet.”

2) Optional encrypted local backup:
   - For advanced users:
     - Generate an encrypted export of the client-side share or a recovery token.
     - Encrypt using your existing encryption utilities.
     - Let user download or store it in their cloud drive.
   - UI location:
     - Settings → Security/Backup tab.
   - For `aa-mpc`, this is optional and implementation-specific to Alchemy’s key model.

3) Legacy compatibility:
   - Keep existing seed/private key flows as an “Advanced” path.
   - Clearly marked as non-recommended vs. “Smart” auth-based accounts.

## 7. Background, Lock, and Sessions

Integrate with [`src/background/index.ts`](src/background/index.ts):

- Lock behavior:
  - When `isWalletLocked()`:
    - Block sensitive RPC / signing as now.
    - Optionally require:
      - Local PIN/password to re-enable use of local state.
      - And/Or silent re-check of `auth.getCurrentUser()` to ensure Alchemy session is intact.
- Unlock flow:
  - If using local PIN:
    - On success, allow access to accounts, including `aa-mpc`.
  - If session expired:
    - Require `auth.signInWithProvider` again.

Key principle:

- Treat Alchemy auth session as necessary context to create the MPC signer.
- Treat local lock as UX/security to protect extension UI access.

## 8. Env & Config Requirements

Add/confirm:

- In `.env.*`:
  - `PLASMO_PUBLIC_ALCHEMY_API_KEY` (already used)
  - `ALCHEMY_APP_ID` or similar (for Account Kit)
  - `ALCHEMY_AUTH_DOMAIN` / `ALCHEMY_REDIRECT_URL` as required by SDK
- In [`src/config/alchemy.ts`](src/config/alchemy.ts):
  - Export:
    - `export const ALCHEMY_APP_ID = process.env.ALCHEMY_APP_ID || ""`
    - Any auth endpoints if needed.

Extension redirects:

- Configure Alchemy auth callback to:
  - `chrome-extension://<extension-id>/tabs/oauth-signin.html`
- Implement `tabs/oauth-signin.html` + React entry that:
  - Completes the auth handshake.
  - Stores `auth_user`.
  - Notifies opener (popup) via `chrome.runtime.sendMessage` or storage change.

## 9. About Page Alignment

After implementing above:

1) Update [`SettingsAboutPage`](src/app/pages/settings/about.tsx):

- Replace:
  - “No Seed Phrases — Just email + social login”
- With text reflecting real behavior, e.g.:
  - “No Seed Phrases — Create and recover your wallet using your email or social login via Alchemy Account Kit (MPC-powered smart accounts).”
- Ensure:
  - Mentions:
    - Smart accounts
    - Gasless / sponsored transactions (where configured)
    - Auth-based recovery and optional advanced backups.

This makes the About statement accurate and implementation-backed.

## 10. Concrete Implementation Tasks

Use this as the dev checklist:

1) Create `src/services/auth.ts` wrapping Alchemy auth.
2) Extend `WalletAccount` type for `aa-mpc` / `authUserId`.
3) Implement userId→accountId mapping helpers in `wallet.ts`.
4) Implement `createSmartAccountForUser(user)` using Account Kit / MPC signer.
5) Update `getAccountClient` to:
   - Select MPC signer for `aa-mpc`.
   - Keep existing path for local/EIP-7702 and imported accounts.
6) Update onboarding/unlock tabs:
   - Add “Continue with Email / Social” flows wired to `auth` + `wallet`.
7) Add backup UI:
   - Show auth-based recovery as default.
   - Provide optional encrypted export for advanced users.
8) Update lock/unlock logic in background/security code to coordinate with auth session.
9) Update About page copy once the above is working.

Once these are implemented, Smart Wallet Pro will genuinely:
- Abstract seed phrases.
- Offer email/social-powered smart accounts.
- Use Alchemy AA infra for transactions and gas.
- Provide a clear backup and recovery story using login and optional encrypted exports.
