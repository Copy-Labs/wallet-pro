import type { PlasmoCSConfig } from "plasmo"

// Content script for relaying messages between injected script and extension popup

// Listen for messages from the injected script (window.postMessage)
window.addEventListener("message", (event) => {
  // Only handle our custom message types
  if (event.data && event.data.type === "ETH_REQUEST") {
    // Forward to background/popup using Plasmo messaging
    chrome.runtime.sendMessage({
      type: "ETH_REQUEST",
      id: event.data.id,
      request: event.data.request,
      origin: event.data.origin,
      tabId: chrome.devtools?.inspectedWindow?.tabId || null
    })
  }
})

// Listen for responses from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ETH_RESPONSE") {
    // Forward back to the injected script
    window.postMessage({
      type: "ETH_RESPONSE",
      id: message.id,
      result: message.result,
      error: message.error
    }, "*")
  }

  if (message.type === "PROVIDER_UPDATE") {
    // Forward provider updates to the injected script
    window.postMessage(message, "*")
  }
})

// Handle popup lifecycle events
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    // Popup opened
    port.onMessage.addListener((message) => {
      if (message.type === "POPUP_READY") {
        // Notify injected script that popup is ready
      }
    })

    port.onDisconnect.addListener(() => {
      // Popup closed
      // Could notify injected script or reset state if needed
    })
  }
})
