/**
 * Provider Controller
 * Handles Ethereum RPC requests from the page
 */

import browser from 'webextension-polyfill'
import { ethErrors } from 'eth-rpc-errors'
import { getActiveAccount, getAllAccounts } from '~services/wallet'
import { getSelectedNetwork, saveSelectedNetwork, getCustomNetworkByChainId } from '~utils/storage'
import { getChainById, defaultChain, supportedChains, chainMetadata } from '~config/chains'
import { createAlchemyClient } from '~config/alchemy'
import type { CustomNetwork } from '~types/network'
import { networkHealthMonitor } from '~utils/network-health-monitor'
import {
  signPersonalMessage,
  signLegacy,
  signTypedData as signTypedDataService,
  sendTransaction as sendTransactionService,
  signTransaction as signTransactionService,
  validateTransaction,
  formatTransactionForDisplay
} from '~services/signing'
import {
  isWalletLocked,
  updateLastActivity,
  startAutoLockTimer,
  isWalletInitialized
} from '~services/security'

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
export class Index {
  private connectedPorts = new Map<string, browser.Runtime.Port>();
  private pendingApprovals = new Map<string, any>();

  constructor() {
    this.setupPortListener()
    this.setupMessageListener()
  }

  /**
   * Setup listener for content script connections
   */
  private setupPortListener(): void {
    browser.runtime.onConnect.addListener((port) => {
      if (port.name === 'contentscript') {
        this.handlePortConnection(port)
      }
    })
  }

  /**
   * Setup listener for approval responses
   */
  private setupMessageListener(): void {
    browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'approval_response') {
        this.handleApprovalResponse(message.data)
      }
      return false
    })
  }

  /**
   * Handle approval response from popup
   */
  private handleApprovalResponse(data: any): void {
    const approval = this.pendingApprovals.get(data.id)
    if (!approval) {
      console.warn('[Background] No pending approval found for:', data.id)
      return
    }

    this.pendingApprovals.delete(data.id)

    if (data.approved && approval.resolve) {
      approval.resolve(data.account || true)
    } else if (approval.reject) {
      approval.reject(ethErrors.provider.userRejectedRequest())
    }
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
   * Check if wallet is locked before processing request
   */
  private async checkWalletLocked(method: string): Promise<void> {
    // Methods that don't require unlock
    const publicMethods = [
      'eth_chainId',
      'eth_blockNumber',
      'eth_call',
      'eth_estimateGas',
      'eth_gasPrice',
      'eth_getBalance',
      'eth_getCode',
      'eth_getTransactionByHash',
      'eth_getTransactionReceipt',
      'eth_getTransactionCount',
      'net_version',
      'web3_clientVersion'
    ]

    if (publicMethods.includes(method)) {
      return // Public methods don't require unlock
    }

    // Check if wallet is locked
    const locked = await isWalletLocked()
    if (locked) {
      throw ethErrors.provider.unauthorized({
        message: 'Wallet is locked. Please unlock to continue.'
      })
    }

    // Update last activity
    await updateLastActivity()
  }

  /**
   * Handle message from content script
   */
  private async handleMessage(message: any, port: browser.Runtime.Port): Promise<void> {
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
      // Check if wallet is locked (for protected methods)
      await this.checkWalletLocked(data.method)

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

      // Signing
      case 'eth_sign':
        return this.legacySign(params, context);

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

      // Chain switching
      case 'wallet_switchEthereumChain':
        return this.switchChain(params, context);

      case 'wallet_addEthereumChain':
        return this.addChain(params, context);

      case 'wallet_disconnectDapp':
        return this.disconnectDApp(params, context);

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
    const isConnected = await this.isOriginConnected(context.origin)
    const chainId = await this.getChainId(context)
    const networkVersion = String(parseInt(chainId, 16))

    if (!isConnected) {
      return {
        chainId,
        networkVersion,
        accounts: [],
        isConnected: false,
      }
    }

    return {
      chainId,
      networkVersion,
      accounts: await this.getAccounts(context),
      isConnected: true,
    }
  }

  /**
   * Report other detected wallets
   */
  private async reportOtherWallets(params: any, context: RequestContext): Promise<void> {
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
    const isConnected = await this.isOriginConnected(context.origin)

    if (isConnected) {
      return this.getAccounts(context)
    }

    // Get active account
    const activeAccount = await getActiveAccount()
    if (!activeAccount) {
      throw ethErrors.rpc.internal({
        message: 'No account available. Please create an account first.'
      })
    }

    // Show approval popup
    await this.showApprovalPopup('connect', {
      origin: context.origin,
      url: context.url,
    })

    // Store connection
    await this.saveConnection(context.origin, [activeAccount.address])

    // Notify all connected tabs about the account change
    this.broadcastEvent('accountsChanged', [activeAccount.address], context.origin)

    return [activeAccount.address]
  }

  /**
   * Get connected accounts
   */
  private async getAccounts(context: RequestContext): Promise<string[]> {
    const isConnected = await this.isOriginConnected(context.origin)

    if (!isConnected) {
      return []
    }

    // Get active account from storage
    const activeAccount = await getActiveAccount()
    if (!activeAccount) {
      return []
    }

    return [activeAccount.address]
  }

  /**
   * Get current chain ID
   */
  private async getChainId(context: RequestContext): Promise<string> {
    const selectedChainId = await getSelectedNetwork()
    const customNetwork = selectedChainId ? await getCustomNetworkByChainId(selectedChainId) : null

    if (customNetwork) {
      // Return custom network chain ID
      return `0x${customNetwork.chainId.toString(16)}`
    }

    const chain = selectedChainId ? getChainById(selectedChainId) : defaultChain
    return `0x${chain.id.toString(16)}`
  }

  /**
   * Switch Ethereum chain
   */
  private async switchChain(params: any, context: RequestContext): Promise<null> {
    const [{ chainId }] = params

    console.log('[Background] Switch chain request:', chainId)

    // Convert hex chainId to number
    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId

    // Check if chain is a custom network first
    const customNetwork = await getCustomNetworkByChainId(chainIdNum)
    if (customNetwork) {
      // Custom network found - allow switching
      await saveSelectedNetwork(chainIdNum)
      console.log('[Background] Switched to custom network:', customNetwork.name, chainIdNum)

      // Emit chainChanged event to all connected tabs
      this.emitChainChanged(chainIdNum)
      return null
    }

    // If not a custom network, check predefined chains
    const chain = getChainById(chainIdNum)
    if (!chain) {
      throw ethErrors.provider.chainDisconnected({
        message: `Chain ${chainIdNum} is not supported. Supported chains: ${supportedChains.map(c => c.id).join(', ')}`
      })
    }

    // Save selected network
    await saveSelectedNetwork(chainIdNum)

    console.log('[Background] Switched to chain:', chain.name, chainIdNum)

    // Emit chainChanged event to all connected tabs
    this.emitChainChanged(chainIdNum)

    return null
  }

  /**
   * Add Ethereum chain
   */
  private async addChain(params: any, context: RequestContext): Promise<null> {
    const [chainConfig] = params

    console.log('[Background] Add chain request:', chainConfig)

    // Convert hex chainId to number
    const chainIdNum = typeof chainConfig.chainId === 'string'
      ? parseInt(chainConfig.chainId, 16)
      : chainConfig.chainId

    // Check if chain is already supported
    const existingChain = getChainById(chainIdNum)
    if (existingChain) {
      // Chain already exists, just switch to it
      await saveSelectedNetwork(chainIdNum)
      this.emitChainChanged(chainIdNum)
      return null
    }

    // For now, we only support predefined chains
    throw ethErrors.provider.unsupportedMethod({
      message: `Adding custom chains is not yet supported. Supported chains: ${supportedChains.map(c => `${c.name} (${c.id})`).join(', ')}`
    })
  }

  /**
   * Personal sign
   */
  private async personalSign(params: any, context: RequestContext): Promise<string> {
    const [message, address] = params

    console.log('[Background] Personal sign request:', { message, address })

    // Show approval popup
    await this.showApprovalPopup('sign', {
      method: 'personal_sign',
      data: message,
      origin: context.origin,
      url: context.url,
    })

    // Use signing service to actually sign
    try {
      const signature = await signPersonalMessage(message, address)
      console.log('[Background] Signature created:', signature)
      return signature
    } catch (error) {
      console.error('[Background] Signing failed:', error)
      throw ethErrors.rpc.internal({
        message: `Signing failed: ${error.message}`
      })
    }
  }

  /**
   * Legacy sign (eth_sign)
   * WARNING: This is a dangerous method as it can sign arbitrary data
   */
  private async legacySign(params: any, context: RequestContext): Promise<string> {
    const [address, message] = params

    console.log('[Background] Legacy sign request:', { address, message })

    // Show approval popup with warning
    await this.showApprovalPopup('sign', {
      method: 'eth_sign',
      data: message,
      origin: context.origin,
      url: context.url,
      warning: '⚠️ WARNING: eth_sign can sign arbitrary data. Only approve if you trust this site!'
    })

    // Use signing service to actually sign
    try {
      const signature = await signLegacy(message, address)
      console.log('[Background] Legacy signature created:', signature)
      return signature
    } catch (error) {
      console.error('[Background] Legacy signing failed:', error)
      throw ethErrors.rpc.internal({
        message: `Signing failed: ${error.message}`
      })
    }
  }

  /**
   * Sign typed data
   */
  private async signTypedData(params: any, context: RequestContext): Promise<string> {
    const [address, typedData] = params

    console.log('[Background] Sign typed data request:', { address, typedData })

    // Show approval popup
    await this.showApprovalPopup('signTypedData', {
      data: typedData,
      origin: context.origin,
      url: context.url,
    })

    // Use signing service to actually sign
    try {
      const signature = await signTypedDataService(address, typedData)
      console.log('[Background] Typed data signature created:', signature)
      return signature
    } catch (error) {
      console.error('[Background] Typed data signing failed:', error)
      throw ethErrors.rpc.internal({
        message: `Signing failed: ${error.message}`
      })
    }
  }

  /**
   * Send transaction
   */
  private async sendTransaction(params: any, context: RequestContext): Promise<string> {
    const [transaction] = params

    console.log('[Background] Send transaction request:', transaction)

    // Validate transaction
    const validation = validateTransaction(transaction)
    if (!validation.valid) {
      throw ethErrors.rpc.invalidParams(validation.error)
    }

    // Format for display in approval popup
    const displayTx = formatTransactionForDisplay(transaction)

    // Show approval popup
    await this.showApprovalPopup('transaction', {
      data: displayTx,
      origin: context.origin,
      url: context.url,
    })

    // Get active account
    const account = await getActiveAccount()
    if (!account) {
      throw ethErrors.rpc.internal({
        message: 'No active account found'
      })
    }

    // Send transaction using signing service
    try {
      const txHash = await sendTransactionService(account.address, transaction)
      console.log('[Background] Transaction sent:', txHash)
      return txHash
    } catch (error) {
      console.error('[Background] Transaction failed:', error)
      throw ethErrors.rpc.internal({
        message: `Transaction failed: ${error.message}`
      })
    }
  }

  /**
   * Sign transaction (without sending)
   */
  private async signTransaction(params: any, context: RequestContext): Promise<string> {
    const [transaction] = params

    console.log('[Background] Sign transaction request:', transaction)

    // Validate transaction
    const validation = validateTransaction(transaction)
    if (!validation.valid) {
      throw ethErrors.rpc.invalidParams(validation.error)
    }

    // Format for display
    const displayTx = formatTransactionForDisplay(transaction)

    // Show approval popup
    await this.showApprovalPopup('signTransaction', {
      data: displayTx,
      origin: context.origin,
      url: context.url,
    })

    // Get active account
    const account = await getActiveAccount()
    if (!account) {
      throw ethErrors.rpc.internal({
        message: 'No active account found'
      })
    }

    // Sign transaction (without sending)
    try {
      const signedTx = await signTransactionService(account.address, transaction)
      console.log('[Background] Transaction signed:', signedTx)
      return signedTx
    } catch (error) {
      console.error('[Background] Transaction signing failed:', error)
      throw ethErrors.rpc.internal({
        message: `Transaction signing failed: ${error.message}`
      })
    }
  }

  /**
   * Disconnect DApp
   */
  private async disconnectDApp(params: any, context: RequestContext): Promise<boolean> {
    const [origin] = params
    console.log('[Background] Disconnect DApp request:', origin)

    try {
      const { disconnectDApp } = await import('~services/connectedDApps')
      await disconnectDApp(origin)

      // Notify the origin that it was disconnected
      this.broadcastEvent('accountsChanged', [], origin)

      return true
    } catch (error) {
      console.error('[Background] Failed to disconnect DApp:', error)
      throw ethErrors.rpc.internal({
        message: `Failed to disconnect DApp: ${error.message}`
      })
    }
  }

  /**
   * Emit chainChanged event to all connected tabs
   */
  private async emitChainChanged(chainId: number): Promise<void> {
    // Check if this is a custom network
    const customNetwork = await getCustomNetworkByChainId(chainId)

    if (customNetwork) {
      // For custom networks, use the custom network chain ID
      chainId = customNetwork.chainId
    }

    const hexChainId = '0x' + chainId.toString(16)

    // Broadcast to all tabs
    browser.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, {
            type: 'CHAIN_CHANGED',
            chainId: hexChainId
          }).catch(() => {
            // Ignore errors for tabs that don't have our content script
          })
        }
      })
    })
  }

  /**
   * Forward request to RPC provider
   */
  private async forwardToRPC(
    method: string,
    params: any,
    context: RequestContext
  ): Promise<unknown> {
    try {
      // Get current chain
      const selectedChainId = await getSelectedNetwork()

      // Check if it's a custom network
      const customNetwork = selectedChainId ? await getCustomNetworkByChainId(selectedChainId) : null

      let client
      if (customNetwork) {
        // Use custom network RPC
        console.log('[Background] Using custom network RPC:', customNetwork.name, customNetwork.rpcUrl)
        client = createAlchemyClient({
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
        })
      } else {
        // Use predefined chain
        const chain = selectedChainId ? getChainById(selectedChainId) : defaultChain
        client = createAlchemyClient(chain)
      }

      console.log('[Background] Forwarding RPC request:', method, params)

      // Use viem's public client to make the request
      const result = await client.request({
        method: method as any,
        params: params as any
      })

      return result
    } catch (error) {
      console.error('[Background] RPC forwarding failed:', error)
      throw ethErrors.rpc.internal({
        message: `RPC request failed: ${error.message}`
      })
    }
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

  private async saveConnection(origin: string, accounts: string[]): Promise<void> {
    await browser.storage.local.set({
      [`connected_${origin}`]: {
        accounts,
        timestamp: Date.now(),
      },
    });
  }

  private async showApprovalPopup(type: string, data: any): Promise<any> {
    console.log('[Background] Showing approval popup:', type, data)

    // Create approval request
    const requestId = `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const request = {
      id: requestId,
      type,
      ...data,
      timestamp: Date.now()
    }

    // Store pending approval
    this.pendingApprovals.set(requestId, { request, resolve: null, reject: null })

    // Get extension URL for approval page
    const approvalUrl = browser.runtime.getURL(`tabs/approval.html?request=${encodeURIComponent(JSON.stringify(request))}`)

    console.log('[Background] Opening approval URL:', approvalUrl)

    // Create popup window
    const popup = await browser.windows.create({
      url: approvalUrl,
      type: 'popup',
      width: 420,
      height: 600,
      focused: true
    })

    // Wait for approval response
    return new Promise((resolve, reject) => {
      const approval = this.pendingApprovals.get(requestId)
      if (approval) {
        approval.resolve = resolve
        approval.reject = reject
      }

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingApprovals.has(requestId)) {
          this.pendingApprovals.delete(requestId)
          reject(ethErrors.provider.userRejectedRequest())
        }
      }, 5 * 60 * 1000)
    })
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

// Initialize and start auto-lock timer
const controller = new Index()

// Start auto-lock timer
startAutoLockTimer()

// Initialize network health monitor
networkHealthMonitor.startMonitoring().catch(error => {
  console.error('[Background] Failed to start network health monitoring:', error)
})

console.log('[Background] Provider controller initialized with security features and network health monitoring')

export default controller
