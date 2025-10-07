/**
 * Communication Bridge between Page and Content Script
 * Uses BroadcastChannel API for secure cross-context messaging
 */

import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { nanoid } from 'nanoid';

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
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

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
   * Send a request to the content script/background
   */
  public async request(data: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = nanoid();

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          ethErrors.rpc.internal({
            message: `Request timeout: ${data.method}`,
          })
        );
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
        reject(
          ethErrors.rpc.internal({
            message: 'Failed to send request',
            data: error,
          })
        );
      }
    });
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
  private pendingRequests: Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

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

  public async request(data: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = nanoid();

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          ethErrors.rpc.internal({
            message: `Request timeout: ${data.method}`,
          })
        );
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      window.postMessage(
        {
          _ethereumProvider: true,
          type: 'request',
          id,
          data,
        },
        this.targetOrigin
      );
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
