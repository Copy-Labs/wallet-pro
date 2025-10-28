/**
 * ISOLATED World Content Script - Communication Bridge
 * This runs in an isolated context and bridges communication between
 * the MAIN world (inpage provider) and the background service worker
 * 
 * Plasmo will inject this into the ISOLATED world automatically
 */

import type { PlasmoCSConfig } from "plasmo"
import browser from 'webextension-polyfill'

// Configure this script to run in ISOLATED world (default)
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: false
}

console.log('[Content Script Bridge] Initializing...')

// ============================================
// Communication Bridge
// ============================================

interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: any) => void
}

class ContentScriptBridge {
  private channel: BroadcastChannel
  private port: browser.Runtime.Port | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private isConnected = false

  constructor() {
    this.channel = new BroadcastChannel('ethereum-provider-bridge')
    this.setupChannelListener()
    this.connectToBackground()
  }

  /**
   * Setup listener for messages from page
   */
  private setupChannelListener(): void {
    this.channel.addEventListener('message', async (event) => {
      const message = event.data

      if (!message || typeof message !== 'object') {
        return
      }

      if (message.type === 'request') {
        await this.handlePageRequest(message)
      }
    })
  }

  /**
   * Connect to background service with improved error handling
   */
  private connectToBackground(): void {
    // Prevent multiple connection attempts
    if (this.isConnected && this.port) {
      console.log('[Content Script Bridge] Already connected to background');
      return;
    }

    try {
      console.log('[Content Script Bridge] Attempting to connect to background...');
      this.port = browser.runtime.connect({ name: 'contentscript' })
      this.isConnected = true

      // Listen for messages from background
      this.port.onMessage.addListener((message) => {
        this.handleBackgroundMessage(message)
      })

      // Handle disconnect with retry logic
      this.port.onDisconnect.addListener(() => {
        console.log('[Content Script Bridge] Disconnected from background')
        this.isConnected = false
        this.port = null

        // Notify page of disconnect
        this.sendToPage({
          type: 'event',
          event: 'disconnect',
          data: { code: 1013, message: 'Disconnected from wallet' },
        })

        // Try to reconnect with exponential backoff
        this.scheduleReconnect(1000) // Start with 1 second
      })

      console.log('[Content Script Bridge] Connected to background successfully')
    } catch (error) {
      console.error('[Content Script Bridge] Failed to connect to background:', error)
      this.isConnected = false

      // Schedule retry for connection failures too
      this.scheduleReconnect(2000) // Longer delay for failed connections
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(delay: number): void {
    // Prevent multiple reconnection timers
    if ((this as any)._reconnectTimer) {
      clearTimeout((this as any)._reconnectTimer);
    }

    (this as any)._reconnectTimer = setTimeout(() => {
      console.log(`[Content Script Bridge] Attempting reconnection after ${delay}ms delay...`);
      (this as any)._reconnectTimer = null;
      this.connectToBackground();
    }, delay);
  }

  /**
   * Handle request from page
   */
  private async handlePageRequest(message: any): Promise<void> {
    const { id, data } = message

    if (!this.isConnected || !this.port) {
      this.sendToPage({
        type: 'response',
        id,
        error: {
          code: -32603,
          message: 'Not connected to wallet',
        },
      })
      return
    }

    try {
      // Forward to background
      this.port.postMessage({
        type: 'request',
        id,
        data,
        origin: window.location.origin,
        url: window.location.href,
      })
    } catch (error: any) {
      this.sendToPage({
        type: 'response',
        id,
        error: {
          code: -32603,
          message: error.message || 'Failed to send request',
        },
      })
    }
  }

  /**
   * Handle message from background
   */
  private handleBackgroundMessage(message: any): void {
    if (!message || typeof message !== 'object') {
      return
    }

    switch (message.type) {
      case 'response':
        // Forward response to page
        this.sendToPage(message)
        break

      case 'event':
        // Forward event to page
        this.sendToPage(message)
        break

      case 'notification':
        // Handle notifications (e.g., show popup)
        this.handleNotification(message)
        break

      default:
        console.warn('[Content Script Bridge] Unknown message type:', message.type)
    }
  }

  /**
   * Send message to page
   */
  private sendToPage(message: any): void {
    try {
      this.channel.postMessage(message)
    } catch (error) {
      console.error('[Content Script Bridge] Failed to send message to page:', error)
    }
  }

  /**
   * Handle notifications from background
   */
  private handleNotification(message: any): void {
    // You can implement custom notification handling here
    console.log('[Content Script Bridge] Notification:', message)
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.channel.close()
    if (this.port) {
      this.port.disconnect()
      this.port = null
    }
    this.isConnected = false
  }
}

// ============================================
// Initialize
// ============================================

// Setup bridge
const bridge = new ContentScriptBridge()

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  bridge.destroy()
})

// Listen for extension messages (e.g., for reconnection)
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'ping') {
    return Promise.resolve('pong')
  }
  return false
})

console.log('[Content Script Bridge] Initialized successfully')

export {}
