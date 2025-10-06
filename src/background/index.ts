import type { PlasmoCSConfig } from "plasmo"

interface StoredDappPermissions {
  [origin: string]: {
    accountId: string
    connectedAt: number
  }
}

interface PendingRequest {
  id: string
  request: any
  origin: string
  port?: chrome.runtime.Port
  resolve: (value: any) => void
  reject: (error: any) => void
  timeout: NodeJS.Timeout
}

let pendingRequests: Map<string, PendingRequest> = new Map()
let popupPort: chrome.runtime.Port | null = null

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ETH_REQUEST") {
    handleEthRequest(message, sender)
  }
})

function handleEthRequest(message: any, sender: chrome.runtime.MessageSender) {
  // If popup is connected, forward directly to it
  if (popupPort) {
    popupPort.postMessage({
      type: "ETH_REQUEST",
      id: message.id,
      request: message.request,
      origin: message.origin,
      tabId: sender.tab?.id
    })

    // Store the request for later resolution
    const request: PendingRequest = {
      id: message.id,
      request: message.request,
      origin: message.origin,
      port: popupPort,
      resolve: () => {},
      reject: () => {},
      timeout: setTimeout(() => {
        rejectRequest(message.id, new Error("Request timeout"))
      }, 300000) // 5 minutes
    }

    pendingRequests.set(message.id, request)
  } else {
    // No popup available, reject the request
    chrome.tabs.sendMessage(sender.tab!.id!, {
      type: "ETH_RESPONSE",
      id: message.id,
      error: { message: "Extension popup not available" }
    })
  }
}

// Handle popup connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    popupPort = port

    // Listen for responses from popup
    port.onMessage.addListener((message) => {
      if (message.type === "ETH_RESPONSE") {
        const request = pendingRequests.get(message.id)
        if (request) {
          clearTimeout(request.timeout)
          pendingRequests.delete(message.id)

          // Forward response back to content script
          chrome.tabs.sendMessage(message.tabId, {
            type: "ETH_RESPONSE",
            id: message.id,
            result: message.result,
            error: message.error
          })
        }
      }

      if (message.type === "PROVIDER_UPDATE") {
        // Broadcast provider updates to all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, message)
            }
          })
        })
      }
    })

    // Handle popup disconnect
    port.onDisconnect.addListener(() => {
      popupPort = null

      // Reject all pending requests
      for (const [id, request] of pendingRequests) {
        rejectRequest(id, new Error("Popup closed"))
      }
      pendingRequests.clear()
    })
  }
})

function rejectRequest(id: string, error: any) {
  const request = pendingRequests.get(id)
  if (request) {
    clearTimeout(request.timeout)
    // Send error response back through appropriate channel
    try {
      chrome.tabs.sendMessage(request.request.tabId, {
        type: "ETH_RESPONSE",
        id,
        error: { message: error.message }
      })
    } catch (e) {
      console.error("Failed to send error response:", e)
    }
  }
}
