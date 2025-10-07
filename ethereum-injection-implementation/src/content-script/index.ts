/**
 * Content Script
 * Bridges communication between page provider and background service
 */

import browser from 'webextension-polyfill';

// ============================================
// 1. Inject Page Provider
// ============================================

/**
 * Inject the page provider script into the page context
 */
function injectPageProvider(): void {
  try {
    const container = document.head || document.documentElement;
    const script = document.createElement('script');

    // Get the page provider script URL from extension
    script.src = browser.runtime.getURL('pageProvider.js');
    script.type = 'text/javascript';

    // Inject at the beginning to ensure we're first
    container.insertBefore(script, container.children[0]);

    // Remove script tag after injection (script already executed)
    script.onload = () => {
      script.remove();
    };

    console.log('[Content Script] Page provider injected');
  } catch (error) {
    console.error('[Content Script] Failed to inject page provider:', error);
  }
}

// ============================================
// 2. Setup Communication Bridge
// ============================================

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class ContentScriptBridge {
  private channel: BroadcastChannel;
  private port: browser.Runtime.Port | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private isConnected = false;

  constructor() {
    this.channel = new BroadcastChannel('ethereum-provider-bridge');
    this.setupChannelListener();
    this.connectToBackground();
  }

  /**
   * Setup listener for messages from page
   */
  private setupChannelListener(): void {
    this.channel.addEventListener('message', async (event) => {
      const message = event.data;

      if (!message || typeof message !== 'object') {
        return;
      }

      if (message.type === 'request') {
        await this.handlePageRequest(message);
      }
    });
  }

  /**
   * Connect to background service
   */
  private connectToBackground(): void {
    try {
      this.port = browser.runtime.connect({ name: 'contentscript' });
      this.isConnected = true;

      // Listen for messages from background
      this.port.onMessage.addListener((message) => {
        this.handleBackgroundMessage(message);
      });

      // Handle disconnect
      this.port.onDisconnect.addListener(() => {
        console.log('[Content Script] Disconnected from background');
        this.isConnected = false;
        this.port = null;

        // Notify page of disconnect
        this.sendToPage({
          type: 'event',
          event: 'disconnect',
          data: { code: 1013, message: 'Disconnected from wallet' },
        });

        // Try to reconnect after a delay
        setTimeout(() => this.connectToBackground(), 1000);
      });

      console.log('[Content Script] Connected to background');
    } catch (error) {
      console.error('[Content Script] Failed to connect to background:', error);
      this.isConnected = false;
    }
  }

  /**
   * Handle request from page
   */
  private async handlePageRequest(message: any): Promise<void> {
    const { id, data } = message;

    if (!this.isConnected || !this.port) {
      this.sendToPage({
        type: 'response',
        id,
        error: {
          code: -32603,
          message: 'Not connected to wallet',
        },
      });
      return;
    }

    try {
      // Forward to background
      this.port.postMessage({
        type: 'request',
        id,
        data,
        origin: window.location.origin,
        url: window.location.href,
      });
    } catch (error: any) {
      this.sendToPage({
        type: 'response',
        id,
        error: {
          code: -32603,
          message: error.message || 'Failed to send request',
        },
      });
    }
  }

  /**
   * Handle message from background
   */
  private handleBackgroundMessage(message: any): void {
    if (!message || typeof message !== 'object') {
      return;
    }

    switch (message.type) {
      case 'response':
        // Forward response to page
        this.sendToPage(message);
        break;

      case 'event':
        // Forward event to page
        this.sendToPage(message);
        break;

      case 'notification':
        // Handle notifications (e.g., show popup)
        this.handleNotification(message);
        break;

      default:
        console.warn('[Content Script] Unknown message type:', message.type);
    }
  }

  /**
   * Send message to page
   */
  private sendToPage(message: any): void {
    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('[Content Script] Failed to send message to page:', error);
    }
  }

  /**
   * Handle notifications from background
   */
  private handleNotification(message: any): void {
    // You can implement custom notification handling here
    console.log('[Content Script] Notification:', message);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.channel.close();
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    this.isConnected = false;
  }
}

// ============================================
// 3. Initialize
// ============================================

// Check if we should inject (avoid injecting in extension pages)
const shouldInject = (): boolean => {
  // Don't inject in extension pages
  if (
    window.location.protocol === 'chrome-extension:' ||
    window.location.protocol === 'moz-extension:'
  ) {
    return false;
  }

  // Don't inject in iframes (optional - you may want to inject in iframes)
  if (window !== window.top) {
    return false;
  }

  return true;
};

// Initialize
if (shouldInject()) {
  // Inject page provider
  injectPageProvider();

  // Setup bridge
  const bridge = new ContentScriptBridge();

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    bridge.destroy();
  });

  // Listen for extension messages (e.g., for reconnection)
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'ping') {
      return Promise.resolve('pong');
    }
    return false;
  });
}

export {};
