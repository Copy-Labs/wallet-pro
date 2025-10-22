/**
 * Communication Bridge between Page and Content Script
 * Uses BroadcastChannel API for secure cross-context messaging
 */

import { EventEmitter } from 'events'
import { ethErrors } from 'eth-rpc-errors'

/**
 * Generate a unique ID for requests
 * Using a simple implementation that works in all contexts
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

interface RequestMessage {
  type: 'request';
  id: string;
  data: {
    method: string;
    params?: unknown[];
  };
}

interface ResponseMessage {
  type: 'response';
  id: string;
  data?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface EventMessage {
  type: 'event';
  event: string;
  data: unknown;
}

type Message = RequestMessage | ResponseMessage | EventMessage;

/**
 * BroadcastChannel-based communication bridge
 */
export class CommunicationBridge extends EventEmitter {
  private channel: BroadcastChannel;
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  private readonly REQUEST_TIMEOUT = 60000; // 60 seconds
  private readonly channelName: string;

  constructor(channelName: string = 'ethereum-provider-bridge') {
    super();
    this.channelName = channelName;
    this.channel = new BroadcastChannel(channelName);
    this.setupListeners();
  }

  /**
   * Setup message listeners
   */
  private setupListeners(): void {
    this.channel.addEventListener('message', (event: MessageEvent<Message>) => {
      const message = event.data;

      if (!message || typeof message !== 'object') {
        return;
      }

      switch (message.type) {
        case 'response':
          this.handleResponse(message);
          break;
        
        case 'event':
          this.handleEvent(message);
          break;
        
        default:
          console.warn('Unknown message type:', message);
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  /**
   * Send a request to the content script/background with Plasmo-compatible error handling
   */
  public async request(data: { method: string; params?: unknown[] }): Promise<unknown> {
    const { method } = data;

    // Try request with error recovery
    try {
      return await this.requestWithRetry(data);
    } catch (error) {
      // Check for common Plasmo/extension errors and provide user-friendly messages
      if (this.isExtensionContextError(error)) {
        throw new Error("Wallet temporarily disconnected. Please refresh the page and try again.");
      }

      if (error.message?.includes('timeout')) {
        throw new Error("Wallet is taking too long to respond. Please check your connection.");
      }

      // Re-throw other errors as-is
      throw error;
    }
  }

  /**
   * Request with basic retry logic for Plasmo compatibility
   */
  private async requestWithRetry(data: { method: string; params?: unknown[] }, attempt = 0): Promise<unknown> {
    const MAX_RETRIES = 1; // Single retry for Plasmo simplicity
    const RETRY_DELAY = 200; // Short delay for context recovery

    return new Promise((resolve, reject) => {
      const id = generateId();

      // Set timeout (Plasmo-compatible duration)
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);

        // If we've exhausted retries, provide helpful error
        if (attempt >= MAX_RETRIES) {
          reject(new Error("Wallet service temporarily unavailable. Please refresh the page."));
        } else {
          // Retry once after delay
          setTimeout(() => {
            this.requestWithRetry(data, attempt + 1).then(resolve).catch(reject);
          }, RETRY_DELAY);
        }
      }, this.REQUEST_TIMEOUT);

      // Store pending request
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send request
      const message: RequestMessage = {
        type: 'request',
        id,
        data,
      };

      try {
        this.channel.postMessage(message);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);

        // Check if this is a recoverable error
        if (this.isExtensionContextError(error) && attempt < MAX_RETRIES) {
          console.warn('[Communication] Extension context error, retrying:', error.message);
          setTimeout(() => {
            this.requestWithRetry(data, attempt + 1).then(resolve).catch(reject);
          }, RETRY_DELAY);
        } else {
          reject(ethErrors.rpc.internal({
            message: 'Failed to communicate with wallet',
            data: error,
          }));
        }
      }
    });
  }

  /**
   * Check if error is due to extension context issues (common in Plasmo)
   */
  private isExtensionContextError(error: any): boolean {
    if (!error) return false;

    const message = error.message || '';
    const code = error.code;

    // Common Chrome extension context error patterns
    return (
      message.includes('Extension context invalidated') ||
      message.includes('context invalidated') ||
      message.includes('Extension context not found') ||
      code === -32603 && message.includes('context') ||
      message.includes('Port disconnected')
    );
  }

  /**
   * Handle response from content script
   */
  private handleResponse(message: ResponseMessage): void {
    const pending = this.pendingRequests.get(message.id);
    
    if (!pending) {
      console.warn('Received response for unknown request:', message.id);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);

    if (message.error) {
      const error = new Error(message.error.message) as any;
      error.code = message.error.code;
      error.data = message.error.data;
      pending.reject(error);
    } else {
      pending.resolve(message.data);
    }
  }

  /**
   * Handle event from content script
   */
  private handleEvent(message: EventMessage): void {
    this.emit(message.event, message.data);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(ethErrors.provider.disconnected());
    }
    this.pendingRequests.clear();

    // Close channel
    this.channel.close();
    this.removeAllListeners();
  }

  /**
   * Check if bridge is ready
   */
  public isReady(): boolean {
    return this.channel !== null;
  }
}

/**
 * Alternative: PostMessage-based communication (for older browsers)
 */
export class PostMessageBridge extends EventEmitter {
  private pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  private readonly REQUEST_TIMEOUT = 60000;
  private readonly targetOrigin = window.location.origin;

  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      // Security: verify origin
      if (event.source !== window) {
        return;
      }

      const message = event.data;
      
      if (!message || !message._ethereumProvider) {
        return;
      }

      switch (message.type) {
        case 'response':
          this.handleResponse(message);
          break;
        
        case 'event':
          this.handleEvent(message);
          break;
      }
    });

    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  public async request(data: { method: string; params?: unknown[] }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = generateId()
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(ethErrors.rpc.internal({
          message: `Request timeout: ${data.method}`,
        }));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      window.postMessage({
        _ethereumProvider: true,
        type: 'request',
        id,
        data,
      }, this.targetOrigin);
    });
  }

  private handleResponse(message: any): void {
    const pending = this.pendingRequests.get(message.id);
    
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);

    if (message.error) {
      const error = new Error(message.error.message) as any;
      error.code = message.error.code;
      error.data = message.error.data;
      pending.reject(error);
    } else {
      pending.resolve(message.data);
    }
  }

  private handleEvent(message: any): void {
    this.emit(message.event, message.data);
  }

  public destroy(): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(ethErrors.provider.disconnected());
    }
    this.pendingRequests.clear();
    this.removeAllListeners();
  }

  public isReady(): boolean {
    return true;
  }
}

export default CommunicationBridge;
