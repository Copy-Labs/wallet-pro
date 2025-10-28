import { useUIStore } from './ui-store'
import { getChainById, defaultChain } from '~/config/chains'
import { getCustomNetworkByChainId } from '~/utils/storage'

// Listen for messages from background script
export function setupBackgroundBridge() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleBackgroundMessage(message, sender, sendResponse)
      return true // Keep message channel open for async responses
    })
  }
}

// Handle different types of background script messages
async function handleBackgroundMessage(message: any, sender: any, sendResponse: any) {
  const store = useUIStore.getState()

  switch (message.type) {
    case 'WALLET_UNLOCKED':
      store.setWalletLocked(false)
      break

    case 'WALLET_LOCKED':
      store.setWalletLocked(true)
      break

    case 'NETWORK_STATUS_CHANGE':
      // Update network status (online/offline)
      store.setNetworkStatus(message.payload)
      break

    case 'ACCOUNT_ACTIVATED':
      // Update active account (if background handles account switching)
      if (message.payload.account) {
        store.setActiveAccount(message.payload.account)
      }
      break

    case 'ACCOUNTS_UPDATED':
      // Refresh account list
      store.setHasAccounts(message.payload.hasAccounts)
      break

    case 'BALANCE_UPDATE':
      // Trigger balance refresh
      store.refreshBalances()
      break

    case 'NETWORK_CHANGED':
      // Handle network change after dapp approval
      if (message.data && message.data.chainId) {
        console.log('[Background Bridge] Network changed to:', message.data.chainId)

        let targetChain = getChainById(message.data.chainId)

        // Check if it's a custom network
        if (!targetChain) {
          const customNetwork = await getCustomNetworkByChainId(message.data.chainId)
          if (customNetwork) {
            targetChain = {
              id: customNetwork.chainId,
              name: customNetwork.name,
              nativeCurrency: customNetwork.currency,
              rpcUrls: {
                default: { http: [customNetwork.rpcUrl] },
                public: { http: [customNetwork.rpcUrl] },
              },
              blockExplorers: customNetwork.blockExplorerUrl ? {
                default: { name: 'Explorer', url: customNetwork.blockExplorerUrl },
              } : undefined,
            }
          }
        }

        if (targetChain) {
          // Update the UI store with the new network
          store.setSelectedNetwork(targetChain)
          // Trigger balance refresh with the new network
          store.refreshBalances()
          console.log('[Background Bridge] UI updated with new network:', targetChain.name)
        }
      }
      break
  }

  // Acknowledge message
  sendResponse({ received: true })
}

// Send messages to background script
export function sendToBackground(message: any) {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage(message).catch(error => {
      console.warn('Failed to send message to background:', error)
    })
  }
}

// Background script helpers
export const backgroundActions = {
  // Notify background when wallet is locked/unlocked
  notifyWalletLockStatus: (locked: boolean) => {
    sendToBackground({ type: 'WALLET_LOCK_STATUS_CHANGED', payload: { locked } })
  },

  // Notify background when network changes
  notifyNetworkChange: (chainId: number) => {
    sendToBackground({ type: 'NETWORK_CHANGED', payload: { chainId } })
  },

  // Request background to check network status
  requestNetworkStatusCheck: () => {
    sendToBackground({ type: 'CHECK_NETWORK_STATUS' })
  }
}
