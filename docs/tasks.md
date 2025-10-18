Perfect — let’s drill this roadmap into a **week-by-week granular checklist**. This way, you (or your dev team) can track deliverables clearly.

---

# ✅ Smart Wallet MVP Detailed Task Breakdown

## **Week 1 — Foundation Setup**

* [x] Scaffold project with **Plasmo**.
* [x] Set up **RadixUI + shadcn** components.
* [x] Implement **auto theming** (light/dark, Radix grass accent).
* [x] Define folder structure (popup, background, content, injected scripts).
* [x] Configure **Viem + Alchemy SDK** connection.
* [x] Build base UI shell with tabs: **Accounts / Networks / Settings**.

---

## **Week 2 — Core Wallet Features**

* [x] Implement **account creation** via Alchemy Smart Wallet.
* [x] Store and manage multiple accounts (local storage).
* [x] Display **balances** (ETH + tokens) per account.
* [x] Build **network switcher** (all Alchemy-supported chains).
* [x] Persist selected network across sessions.

---

## **Week 3 — Transactions**

* [x] Implement **send ETH/token** flow.
* [x] Implement **receive** screen (QR + address copy).
* [x] Build middleware check for **gas sponsorship (<$1)**.
* [x] Integrate fallback for normal gas payment.
* [x] Display **transaction history** (fetched from Alchemy API).

---

## **Week 4 — DApp Connect**

* [X] Inject **window.ethereum** provider for DApps.
* [X] Handle **connect account request** (popup prompt).
* [X] Handle **transaction request from DApp**.
* [X] Show confirmation popup: details + sponsorship info.
* [X] Test against common DApps (Uniswap, OpenSea, Aave).

---

## **Week 5 — Settings + Polish**

* [x] Add settings screen:

  * Manage accounts (rename, remove).
  * Manage gas sponsorship toggle + thresholds.
* [x] Polish UI with consistent minimalistic style.
* [x] Implement error states + user-friendly messages.
* [x] Add basic **notifications** (success/fail tx).
* [x] Implement **transaction logging** (foundation for risk engine).

---

## **Week 6 — Testing + Distribution**

* [ ] Internal QA: balances, tx flows, DApp connections.
* [ ] Security pass: verify provider injection is isolated.
* [ ] Build production extension bundle.
* [ ] Prepare assets (logo, screenshots, description).
* [ ] Submit to **Chrome Web Store** (under Smart Wallet brand).
* [ ] Prep for **early testers**.

---

# 🔮 Post-MVP (Future)

* [ ] Mobile wallet (Expo + RN, shared Wallet Core).
* [ ] AI Risk Engine integration.
* [ ] Premium tier for higher gas sponsorship.
* [ ] NFT + cross-chain support.

---

I have questions before you proceed with other steps. This wallet is meant to be a wallet that creates smart wallets. It is meant to be a better User Experience (UX) than the other wallets out there. Such that using this wallet abstracts every complexities such as having to keep track of their private keys, seed phrases, etc. And that's why we decided to use Alchemy for creating Smart Accounts for users, so that they can create wallets using their email, and other social auths - we believe this will greatly allow non-technical users and the everyday users to be able to gain access to blockchain technology and the world of web3. Does all what we have implemented so far align with this mission?

⚡ This breakdown gives you a **weekly deliverables checklist** that’s practical for sprint planning and progress tracking.
