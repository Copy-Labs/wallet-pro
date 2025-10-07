// Plasmo Background Script - Service Worker Context
// NO window access allowed here - only service worker APIs

import { relay } from "@plasmohq/messaging"
import {
  getStoredAccounts,
  getSelectedNetwork,
  getDAppPermission,
  addDAppPermission,
  updateDAppPermissionLastUsed
} from "~utils/storage"

// Helpers
const toHexChainId = (chainId: number | null) => (chainId ? `0x${chainId.toString(16)}` : "0x1")

// EIP-1193: eth_chainId
export const ethChainId = relay(async (_req, res) => {
  const selected = await getSelectedNetwork()
  res.send({ chainId: toHexChainId(selected) })
})

// EIP-1193: eth_accounts
export const ethAccounts = relay(async (req, res) => {
  const { origin } = req.body as { origin?: string }
  const accountsState = await getStoredAccounts()

  if (!origin) {
    const active = accountsState.accounts.find(a => a.id === accountsState.activeAccountId)
    res.send({ accounts: active ? [active.address] : [] })
    return
  }

  const perm = await getDAppPermission(origin)
  if (!perm) {
    res.send({ accounts: [] })
    return
  }

  const allowed = accountsState.accounts.find(a => a.id === perm.accountId)
  await updateDAppPermissionLastUsed(origin)
  res.send({ accounts: allowed ? [allowed.address] : [] })
})

// EIP-1193: eth_requestAccounts
export const ethRequestAccounts = relay(async (req, res) => {
  const { origin, approvedAccountId } = req.body as { origin: string; approvedAccountId?: string }
  const accountsState = await getStoredAccounts()
  const account = accountsState.accounts.find(a => a.id === (approvedAccountId || accountsState.activeAccountId))
  if (!account) {
    res.send({ accounts: [] })
    return
  }
  if (origin) {
    await addDAppPermission(origin, account.id)
    await updateDAppPermissionLastUsed(origin)
  }
  res.send({ accounts: [account.address] })
})

// Transaction relay handler for popup transactions
export const relayEthTransaction = relay(async (req, res) => {
  try {
    const { transactionData, accountId, origin } = req.body

    console.log('💸 Background processing transaction:', accountId)

    // Transaction logic would go here, but for now we just acknowledge
    // Actual processing happens in popup for user approval

    res.send({ success: true, needsApproval: true, origin, accountId, transactionData })
  } catch (error) {
    console.error('❌ Background transaction error:', error)
    res.send({ success: false, error: (error as any).message })
  }
})

// Basic health check relay
export const relayHealth = relay(async (req, res) => {
  res.send({
    success: true,
    context: 'service-worker',
    timestamp: Date.now()
  })
})
