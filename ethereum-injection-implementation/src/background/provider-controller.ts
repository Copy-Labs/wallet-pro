/**
 * Provider Controller
 * Handles Ethereum RPC requests from the page
 */

import browser from 'webextension-polyfill';
import { ethErrors } from 'eth-rpc-errors';

interface RequestContext {
  origin: string;
  url: string;
  tabId?: number;
}

interface RPCRequest {
  method: string;
  params?: unknown[];
}

/**
 * Provider Controller Class
 */
export class ProviderController {
  private connectedPorts = new Map<string, browser.Runtime.Port>();
  private pendingApprovals = new Map<string, any>();

  constructor() {
    this.setupPortListener();
  }

  /**
   * Setup listener for content script connections
   */
  private setupPortListener(): void {
    browser.runtime.onConnect.addListener((port) => {
      if (port.name === 'contentscript') {
        this.handlePortConnection(port);
      }
    });
  }

  /**
   * Handle new port connection from content script
   */
  private handlePortConnection(port: browser.Runtime.Port): void {
    const portId = `${port.sender?.tab?.id || 'unknown'}-${Date.now()}`;
    this.connectedPorts.set(portId, port);

    console.log('[Background] Content script connected:', portId);

    // Listen for messages
    port.onMessage.addListener(async (message) => {
      await this.handleMessage(message, port);
    });

    // Handle disconnect
    port.onDisconnect.addListener(() => {
      console.log('[Background] Content script disconnected:', portId);
      this.connectedPorts.delete(portId);
    });
  }

  /**
   * Handle message from content script
   */
  private async handleMessage(
    message: any,
    port: browser.Runtime.Port
  ): Promise<void> {
    if (!message || message.type !== 'request') {
      return;
    }

    const { id, data, origin, url } = message;
    const context: RequestContext = {
      origin,
      url,
      tabId: port.sender?.tab?.id,
    };

    try {
      const result = await this.handleRPCRequest(data, context);

      // Send response back
      port.postMessage({
        type: 'response',
        id,
        data: result,
      });
    } catch (error: any) {
      // Send error back
      port.postMessage({
        type: 'response',
        id,
        error: {
          code: error.code || -32603,
          message: error.message || 'Internal error',
          data: error.data,
        },
      });
    }
  }

  /**
   * Handle RPC request
   */
  private async handleRPCRequest(
    request: RPCRequest,
    context: RequestContext
  ): Promise<unknown> {
    const { method, params } = request;

    console.log('[Background] RPC Request:', method, params, context.origin);

    // Route to appropriate handler
    switch (method) {
      // Connection & State
      case 'wallet_getInitialState':
        return this.getInitialState(context);

      case 'wallet_reportOtherWallets':
        return this.reportOtherWallets(params, context);

      // Account Management
      case 'eth_requestAccounts':
        return this.requestAccounts(context);

      case 'eth_accounts':
        return this.getAccounts(context);

      // Chain Management
      case 'eth_chainId':
        return this.getChainId(context);

      case 'wallet_switchEthereumChain':
        return this.switchChain(params, context);

      case 'wallet_addEthereumChain':
        return this.addChain(params, context);

      // Signing
      case 'eth_sign':
      case 'personal_sign':
        return this.personalSign(params, context);

      case 'eth_signTypedData':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
        return this.signTypedData(params, context);

      // Transactions
      case 'eth_sendTransaction':
        return this.sendTransaction(params, context);

      case 'eth_signTransaction':
        return this.signTransaction(params, context);

      // Read-only methods (forward to RPC)
      case 'eth_blockNumber':
      case 'eth_call':
      case 'eth_estimateGas':
      case 'eth_gasPrice':
      case 'eth_getBalance':
      case 'eth_getCode':
      case 'eth_getTransactionByHash':
      case 'eth_getTransactionReceipt':
      case 'eth_getTransactionCount':
      case 'net_version':
        return this.forwardToRPC(method, params, context);

      default:
        throw ethErrors.rpc.methodNotSupported({
          message: `Method ${method} is not supported`,
        });
    }
  }

  // ============================================
  // Method Implementations
  // ============================================

  /**
   * Get initial state for page provider
   */
  private async getInitialState(context: RequestContext): Promise<any> {
    // TODO: Implement actual state retrieval from storage
    const isConnected = await this.isOriginConnected(context.origin);

    if (!isConnected) {
      return {
        chainId: '0x1', // Ethereum mainnet
        networkVersion: '1',
        accounts: [],
        isConnected: false,
      };
    }

    return {
      chainId: '0x1', // TODO: Get from storage
      networkVersion: '1',
      accounts: await this.getAccounts(context),
      isConnected: true,
    };
  }

  /**
   * Report other detected wallets
   */
  private async reportOtherWallets(
    params: any,
    context: RequestContext
  ): Promise<void> {
    const wallets = params?.[0] || [];
    console.log('[Background] Other wallets detected:', wallets);

    // TODO: Store this information for wallet selection UI
    // You can use browser.storage.local to persist this

    return;
  }

  /**
   * Request account access (requires user approval)
   */
  private async requestAccounts(context: RequestContext): Promise<string[]> {
    // Check if already connected
    const isConnected = await this.isOriginConnected(context.origin);

    if (isConnected) {
      return this.getAccounts(context);
    }

    // Show approval popup
    const accounts = await this.showApprovalPopup('connect', {
      origin: context.origin,
      url: context.url,
    });

    if (!accounts || accounts.length === 0) {
      throw ethErrors.provider.userRejectedRequest();
    }

    // Store connection
    await this.saveConnection(context.origin, accounts);

    return accounts;
  }

  /**
   * Get connected accounts
   */
  private async getAccounts(context: RequestContext): Promise<string[]> {
    const isConnected = await this.isOriginConnected(context.origin);

    if (!isConnected) {
      return [];
    }

    // TODO: Get actual accounts from storage
    // This is a placeholder
    return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
  }

  /**
   * Get current chain ID
   */
  private async getChainId(context: RequestContext): Promise<string> {
    // TODO: Get from storage or user preference
    return '0x1'; // Ethereum mainnet
  }

  /**
   * Switch Ethereum chain
   */
  private async switchChain(
    params: any,
    context: RequestContext
  ): Promise<null> {
    const chainId = params?.[0]?.chainId;

    if (!chainId) {
      throw ethErrors.rpc.invalidParams();
    }

    // TODO: Implement chain switching logic
    console.log('[Background] Switch chain requested:', chainId);

    // Notify all connected tabs
    this.broadcastEvent(
      'chainChanged',
      {
        chainId,
        networkVersion: String(parseInt(chainId, 16)),
      },
      context.origin
    );

    return null;
  }

  /**
   * Add Ethereum chain
   */
  private async addChain(params: any, context: RequestContext): Promise<null> {
    const chainParams = params?.[0];

    if (!chainParams) {
      throw ethErrors.rpc.invalidParams();
    }

    // TODO: Implement add chain logic
    console.log('[Background] Add chain requested:', chainParams);

    return null;
  }

  /**
   * Personal sign
   */
  private async personalSign(
    params: any,
    context: RequestContext
  ): Promise<string> {
    // Show signing popup
    const signature = await this.showApprovalPopup('sign', {
      method: 'personal_sign',
      params,
      origin: context.origin,
    });

    if (!signature) {
      throw ethErrors.provider.userRejectedRequest();
    }

    return signature;
  }

  /**
   * Sign typed data
   */
  private async signTypedData(
    params: any,
    context: RequestContext
  ): Promise<string> {
    const signature = await this.showApprovalPopup('signTypedData', {
      params,
      origin: context.origin,
    });

    if (!signature) {
      throw ethErrors.provider.userRejectedRequest();
    }

    return signature;
  }

  /**
   * Send transaction
   */
  private async sendTransaction(
    params: any,
    context: RequestContext
  ): Promise<string> {
    const txHash = await this.showApprovalPopup('transaction', {
      params,
      origin: context.origin,
    });

    if (!txHash) {
      throw ethErrors.provider.userRejectedRequest();
    }

    return txHash;
  }

  /**
   * Sign transaction (without sending)
   */
  private async signTransaction(
    params: any,
    context: RequestContext
  ): Promise<string> {
    const signedTx = await this.showApprovalPopup('signTransaction', {
      params,
      origin: context.origin,
    });

    if (!signedTx) {
      throw ethErrors.provider.userRejectedRequest();
    }

    return signedTx;
  }

  /**
   * Forward request to RPC provider
   */
  private async forwardToRPC(
    method: string,
    params: any,
    context: RequestContext
  ): Promise<unknown> {
    // TODO: Implement RPC forwarding
    // You would typically use fetch or a library like ethers.js

    const chainId = await this.getChainId(context);
    const rpcUrl = this.getRPCUrl(chainId);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getRPCUrl(chainId: string): string {
    // TODO: Map chain IDs to RPC URLs
    const rpcUrls: Record<string, string> = {
      '0x1': 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
      '0x89': 'https://polygon-rpc.com',
      // Add more chains
    };

    return rpcUrls[chainId] || rpcUrls['0x1'];
  }

  private async isOriginConnected(origin: string): Promise<boolean> {
    // TODO: Check storage for connection status
    const result = await browser.storage.local.get(`connected_${origin}`);
    return !!result[`connected_${origin}`];
  }

  private async saveConnection(
    origin: string,
    accounts: string[]
  ): Promise<void> {
    await browser.storage.local.set({
      [`connected_${origin}`]: {
        accounts,
        timestamp: Date.now(),
      },
    });
  }

  private async showApprovalPopup(type: string, data: any): Promise<any> {
    // TODO: Implement popup window for approvals
    // This would typically open a new window with your approval UI

    console.log('[Background] Approval required:', type, data);

    // For now, return mock data
    // In production, this would wait for user interaction
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(null); // User would approve/reject
      }, 1000);
    });
  }

  private broadcastEvent(event: string, data: any, origin?: string): void {
    // Broadcast to all connected ports
    for (const port of this.connectedPorts.values()) {
      if (!origin || port.sender?.url?.startsWith(origin)) {
        port.postMessage({
          type: 'event',
          event,
          data,
        });
      }
    }
  }
}

export default new ProviderController();
