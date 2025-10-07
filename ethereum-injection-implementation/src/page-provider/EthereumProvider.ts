/**
 * EIP-1193 Ethereum Provider Implementation
 * This provider is injected into the web page context
 */

import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';

interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface ProviderConnectInfo {
  chainId: string;
}

interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export class EthereumProvider extends EventEmitter {
  // EIP-1193 required properties
  public chainId: string | null = null;
  public selectedAddress: string | null = null;
  public networkVersion: string | null = null;

  // Wallet identification
  public isYourWallet = true;
  public isMetaMask = true; // For compatibility with dApps expecting MetaMask

  // Internal state
  private _isConnected = false;
  private _isInitialized = false;
  private _accounts: string[] = [];

  // Communication bridge (will be set by the page provider)
  private _bridge: any = null;

  constructor() {
    super();
    this.setMaxListeners(100); // Prevent memory leak warnings
  }

  /**
   * Initialize the provider
   */
  public initialize(bridge: any): void {
    this._bridge = bridge;
    this._isInitialized = true;
    this.emit('_initialized');
  }

  /**
   * EIP-1193: Main request method
   * All Ethereum RPC requests go through this method
   */
  public async request(args: RequestArguments): Promise<unknown> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw ethErrors.rpc.invalidRequest({
        message: 'Expected a single, non-array, object argument.',
        data: args,
      });
    }

    const { method, params } = args;

    if (typeof method !== 'string' || method.length === 0) {
      throw ethErrors.rpc.invalidRequest({
        message: 'Method must be a non-empty string.',
        data: args,
      });
    }

    // Handle some methods locally for performance
    switch (method) {
      case 'eth_accounts':
        return this._accounts;

      case 'eth_chainId':
        return this.chainId;

      case 'net_version':
        return this.networkVersion;

      case 'eth_coinbase':
        return this.selectedAddress;

      default:
        // Forward to background via bridge
        if (!this._bridge) {
          throw ethErrors.provider.disconnected();
        }
        return this._bridge.request({ method, params });
    }
  }

  /**
   * EIP-1193: Check if provider is connected
   */
  public isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Legacy MetaMask API: enable
   * @deprecated Use eth_requestAccounts instead
   */
  public async enable(): Promise<string[]> {
    console.warn(
      'ethereum.enable() is deprecated. Use ethereum.request({ method: "eth_requestAccounts" }) instead.'
    );
    return this.request({ method: 'eth_requestAccounts' }) as Promise<string[]>;
  }

  /**
   * Legacy MetaMask API: sendAsync
   * @deprecated Use request() instead
   */
  public sendAsync(
    payload: {
      id?: number;
      jsonrpc?: string;
      method: string;
      params?: unknown[];
    },
    callback: (error: Error | null, response?: any) => void
  ): void {
    console.warn(
      'ethereum.sendAsync() is deprecated. Use ethereum.request() instead.'
    );

    this.request({ method: payload.method, params: payload.params })
      .then((result) => {
        callback(null, {
          id: payload.id,
          jsonrpc: payload.jsonrpc || '2.0',
          result,
        });
      })
      .catch((error) => {
        callback(error);
      });
  }

  /**
   * Legacy MetaMask API: send
   * @deprecated Use request() instead
   */
  public send(
    methodOrPayload: string | { method: string; params?: unknown[] },
    paramsOrCallback?:
      | unknown[]
      | ((error: Error | null, response?: any) => void)
  ): Promise<unknown> | void {
    console.warn(
      'ethereum.send() is deprecated. Use ethereum.request() instead.'
    );

    // Case 1: send(method, params)
    if (
      typeof methodOrPayload === 'string' &&
      Array.isArray(paramsOrCallback)
    ) {
      return this.request({
        method: methodOrPayload,
        params: paramsOrCallback,
      });
    }

    // Case 2: send(payload, callback)
    if (
      typeof methodOrPayload === 'object' &&
      typeof paramsOrCallback === 'function'
    ) {
      this.sendAsync(methodOrPayload, paramsOrCallback);
      return;
    }

    // Case 3: send(payload) - synchronous (very legacy)
    if (typeof methodOrPayload === 'object') {
      const method = methodOrPayload.method;

      // Only support synchronous methods
      if (method === 'eth_accounts') {
        return Promise.resolve(this._accounts);
      }
      if (method === 'eth_coinbase') {
        return Promise.resolve(this.selectedAddress);
      }
      if (method === 'eth_uninstallFilter') {
        return Promise.resolve(true);
      }

      throw new Error('Synchronous methods are not supported');
    }

    throw new Error('Invalid send() arguments');
  }

  // ============================================
  // Internal methods (called by page provider)
  // ============================================

  /**
   * Update connection status
   */
  _setConnected(isConnected: boolean, chainId?: string): void {
    const wasConnected = this._isConnected;
    this._isConnected = isConnected;

    if (isConnected && !wasConnected) {
      this.emit('connect', {
        chainId: chainId || this.chainId,
      } as ProviderConnectInfo);
    } else if (!isConnected && wasConnected) {
      this.emit('disconnect', ethErrors.provider.disconnected());
    }
  }

  /**
   * Update accounts
   */
  _setAccounts(accounts: string[]): void {
    if (!Array.isArray(accounts)) {
      throw new Error('Accounts must be an array');
    }

    const oldAccounts = this._accounts;
    this._accounts = accounts;
    this.selectedAddress = accounts[0] || null;

    // Only emit if accounts actually changed
    if (JSON.stringify(oldAccounts) !== JSON.stringify(accounts)) {
      this.emit('accountsChanged', accounts);
    }
  }

  /**
   * Update chain
   */
  _setChain(chainId: string, networkVersion?: string): void {
    const oldChainId = this.chainId;
    const oldNetworkVersion = this.networkVersion;

    this.chainId = chainId;
    this.networkVersion = networkVersion || String(parseInt(chainId, 16));

    if (oldChainId !== chainId) {
      this.emit('chainChanged', chainId);
    }

    if (oldNetworkVersion !== this.networkVersion) {
      this.emit('networkChanged', this.networkVersion);
    }
  }

  /**
   * Handle disconnect
   */
  _handleDisconnect(error?: ProviderRpcError): void {
    this._isConnected = false;
    this._accounts = [];
    this.selectedAddress = null;

    this.emit('disconnect', error || ethErrors.provider.disconnected());
    this.emit('close', error || ethErrors.provider.disconnected());
    this.emit('accountsChanged', []);
  }

  /**
   * Get current state (for debugging)
   */
  _getState() {
    return {
      accounts: this._accounts,
      chainId: this.chainId,
      networkVersion: this.networkVersion,
      isConnected: this._isConnected,
      isInitialized: this._isInitialized,
    };
  }
}

export default EthereumProvider;
