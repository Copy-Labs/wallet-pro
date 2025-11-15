/**
 * Provider Controller
 * Handles Ethereum RPC requests from the page
 */

import browser from 'webextension-polyfill'
import { ethErrors } from 'eth-rpc-errors'
import { Storage } from "@plasmohq/storage"
import { getActiveAccount, getAllAccounts } from '~services/wallet'
import {
  getSelectedNetwork, saveSelectedNetwork, getCustomNetworkByChainId, saveCustomNetwork,
  updateCustomNetworkLastUsed
} from '~utils/storage'
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
import type {Chain} from "viem";
import {TransactionStatusMonitor} from "~services/transactionStatusMonitor";

interface RequestContext {
  origin: string;
  url: string;
  tabId?: number;
}

interface RPCRequest {
  method: string;
  params?: unknown[];
}

interface Permission {
  parentCapability: string;
  caveats?: any[];
}

/**
 * Provider Controller Class
 */
export class Index {
  private connectedPorts = new Map<string, browser.Runtime.Port>();
  private pendingApprovals = new Map<string, any>();
  // Store pending connection request for delayed processing after unlock
  private pendingConnectionRequest: {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    context: RequestContext;
    method: string;
  } | null = null;

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

    // Check if this is a network switch approval
    if (approval.request?.type === 'switchNetwork') {
      this.pendingApprovals.delete(data.id)

      if (data.approved && approval.resolve) {
        // Perform the actual network switch
        this.performNetworkSwitchAsync(approval.targetChain, approval.targetCustomNetwork)
          .then(() => approval.resolve(true))
          .catch(error => {
            console.error('[Background] Network switch failed:', error)
            approval.reject(error)
          })
      } else if (approval.reject) {
        approval.reject(ethErrors.provider.userRejectedRequest())
      }
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
   * Handle network switch approval request from UI
   */
  private async handleNetworkSwitchApprovalRequest(data: any): Promise<void> {
    console.log('[Background] Network switch approval request:', data)

    const { id, targetChain } = data

    // Convert targetChain back to Chain/CustomNetwork format
    let targetCustomNetwork = null
    let chain = supportedChains.find(c => c.id === targetChain.id)

    if (!chain && targetChain.isCustom) {
      // This is a custom network
      targetCustomNetwork = {
        id: `custom_${targetChain.id}_${Date.now()}`,
        name: targetChain.name,
        chainId: targetChain.id,
        rpcUrl: targetChain.rpcUrls.default.http[0],
        currency: targetChain.nativeCurrency,
        blockExplorerUrl: targetChain.blockExplorers?.default.url,
        isActive: true,
        dateAdded: Date.now(),
        status: 'checking' as const,
      }
      chain = {
        id: targetChain.id,
        name: targetChain.name,
        nativeCurrency: targetChain.nativeCurrency,
        rpcUrls: targetChain.rpcUrls,
        blockExplorers: targetChain.blockExplorers,
        testnet: false,
      }
    }

    // Show approval popup for network switch
    try {
      await this.showNetworkSwitchApprovalPopup(id, targetChain)
    } catch (error) {
      console.error('[Background] Network switch approval failed:', error)
      // Send response back to UI
      chrome.runtime.sendMessage({
        type: 'network_switch_response',
        data: {
          id,
          success: false,
          error: error.message
        }
      })
    }
  }

  /**
   * Show network switch approval popup
   */
  private async showNetworkSwitchApprovalPopup(approvalId: string, targetChain: any): Promise<void> {
    console.log('[Background] Showing network switch approval popup:', approvalId, targetChain)

    // Create approval request
    const requestId = `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const request = {
      id: requestId,
      type: 'switchNetwork',
      origin: 'Smart Wallet Pro',
      url: window.location.origin,
      timestamp: Date.now(),
      targetChain
    }

    // Store pending approval with chain information
    this.pendingApprovals.set(requestId, {
      request,
      resolve: null,
      reject: null,
      targetChain,
      approvalId
    })

    // Get extension URL for approval page
    const approvalUrl = browser.runtime.getURL(`tabs/approval.html?request=${encodeURIComponent(JSON.stringify(request))}`)

    console.log('[Background] Opening network switch approval URL:', approvalUrl)

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
          reject(new Error('Network switch approval timed out'))
        }
      }, 5 * 60 * 1000)
    })
  }

  /**
   * Show approval popup for dapp network switch requests
   */
  private async showDappNetworkSwitchApproval(targetChain: Chain, targetCustomNetwork: CustomNetwork | null, context: RequestContext): Promise<any> {
    console.log('[Background] Showing dapp network switch approval popup for:', targetChain.name)

    // Create approval request
    const requestId = `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const request = {
      id: requestId,
      type: 'switchNetwork',
      origin: context.origin,
      url: context.url,
      timestamp: Date.now(),
      targetChain: {
        id: targetChain.id,
        name: targetChain.name,
        nativeCurrency: targetChain.nativeCurrency,
        rpcUrls: targetChain.rpcUrls,
        blockExplorers: targetChain.blockExplorers,
        isCustom: !!targetCustomNetwork
      }
    }

    // Store pending approval with chain information and context
    this.pendingApprovals.set(requestId, {
      request,
      resolve: null,
      reject: null,
      targetChain,
      targetCustomNetwork,
      context
    })

    // Get extension URL for approval page
    const approvalUrl = browser.runtime.getURL(`tabs/approval.html?request=${encodeURIComponent(JSON.stringify(request))}`)

    console.log('[Background] Opening dapp network switch approval URL:', approvalUrl)

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
          reject(new Error('Network switch approval timed out'))
        }
      }, 5 * 60 * 1000)
    })
  }

  /**
   * Perform the actual network switch after approval
   */
  private async performNetworkSwitchAsync(targetChain: Chain, targetCustomNetwork?: CustomNetwork): Promise<void> {
    console.log('[Background] Performing network switch to:', targetChain.name)

    try {
      if (targetCustomNetwork) {
        // Check if custom network exists, if not save it
        const existingCustom = await getCustomNetworkByChainId(targetCustomNetwork.chainId)
        if (!existingCustom) {
          await saveCustomNetwork(targetCustomNetwork)
        } else {
          // Update last used time
          await updateCustomNetworkLastUsed(targetCustomNetwork.id)
        }
      }

      // Switch to the network (this will automatically sync to UI via storage-sync.ts)
      await saveSelectedNetwork(targetChain.id)

      // Emit chainChanged event for connected dapps
      await this.emitChainChanged(targetChain.id)

      // Notify UI about network change for immediate refresh
      browser.runtime.sendMessage({
        type: 'NETWORK_CHANGED',
        data: { chainId: targetChain.id }
      }).catch(() => {
        // Ignore errors if UI is not listening (popup closed, etc.)
      })

      console.log('[Background] Network switch completed successfully')
    } catch (error) {
      console.error('[Background] Network switch failed:', error)
      throw error
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
  private async checkWalletLocked(method: string, context: RequestContext): Promise<void> {
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
      'eth_getBlockByNumber',
      'eth_getBlockByHash',
      'net_version',
      'web3_clientVersion',
      // Provider initialization should be public - dApps need initial state without unlock
      'wallet_getInitialState',
      // Disconnect operations should be public - no need to unlock wallet to disconnect
      'wallet_revokePermissions',
      'wallet_disconnectDapp',
      // Watch asset is public - adding tokens should be allowed without unlock
      'wallet_watchAsset'
    ]

    if (publicMethods.includes(method)) {
      return // Public methods don't require unlock
    }

    // Check if wallet is locked
    const locked = await isWalletLocked()
    if (locked) {
      console.log('Smart WalletPro is locked - queuing for unlock');
      // For connection methods, show unlock popup instead of error
      const connectMethods = ['eth_requestAccounts', 'wallet_requestPermissions']
      const permissionMethods = ['wallet_getPermissions']

      if (connectMethods.includes(method) || permissionMethods.includes(method)) {
        // Try auto-popup + queue combo for best UX
        await this.popAndQueueForUnlock(method, context)
        return
      }

      // For other protected methods, throw error
      throw ethErrors.provider.unauthorized({
        message: 'Wallet is locked. Please unlock to continue.'
      })
    }

    // Update last activity for unlocked wallet
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
      await this.checkWalletLocked(data.method, context)

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
        return this.addChain(params);

      // Permission management
      case 'wallet_requestPermissions':
        return this.requestPermissions(params, context);

      case 'wallet_revokePermissions':
        return this.revokePermissions(params, context);

      case 'wallet_getPermissions':
        return this.getPermissions(context);

      case 'wallet_disconnectDapp':
        return this.disconnectDApp(params, context);

      // Watch Asset (EIP-747)
      case 'wallet_watchAsset':
        return this.watchAsset(params, context);

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
      case 'eth_getBlockByNumber':
      case 'eth_getBlockByHash':
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
    console.log('[Background] Inside Request accounts:', context.origin);
    const isConnected = await this.isOriginConnected(context.origin)
    console.log('[Background] Request accounts:', context.origin, isConnected);

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

    console.log('[Background] Switch chain request:', chainId, 'from:', context.origin)

    // Convert hex chainId to number
    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId

    // Find the target chain (predefined or custom)
    let targetChain = getChainById(chainIdNum)
    let targetCustomNetwork = null

    if (!targetChain) {
      targetCustomNetwork = await getCustomNetworkByChainId(chainIdNum)
      if (targetCustomNetwork) {
        targetChain = {
          id: targetCustomNetwork.chainId,
          name: targetCustomNetwork.name,
          nativeCurrency: targetCustomNetwork.currency,
          rpcUrls: {
            default: { http: [targetCustomNetwork.rpcUrl] },
            public: { http: [targetCustomNetwork.rpcUrl] },
          },
          blockExplorers: targetCustomNetwork.blockExplorerUrl ? {
            default: { name: 'Explorer', url: targetCustomNetwork.blockExplorerUrl },
          } : undefined,
        }
      }
    }

    if (!targetChain) {
      throw ethErrors.provider.chainDisconnected({
        message: `Chain ${chainIdNum} is not supported. Supported chains: ${supportedChains.map(c => c.id).join(', ')}`
      })
    }

    // Check if requested network is already active
    const currentChainId = await getSelectedNetwork()
    if (chainIdNum === currentChainId) {
      console.log('[Background] Network switch request: already on target network, no popup needed')
      // Just emit chainChanged to notify dapp we're already on the requested network
      await this.emitChainChanged(chainIdNum)
      return null
    }

    // Different network - show approval popup for network switch requests from dapps
    await this.showDappNetworkSwitchApproval(targetChain, targetCustomNetwork, context)

    console.log('[Background] Network switch approved for:', targetChain.name, chainIdNum)

    return null
  }

  /**
   * Validate chain configuration according to MetaMask specification
   */
  private validateChainConfig(chainConfig: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required: chainId
    if (!chainConfig.chainId) {
      errors.push('chainId is required')
    } else {
      const chainIdNum = typeof chainConfig.chainId === 'string'
        ? parseInt(chainConfig.chainId, 16)
        : chainConfig.chainId

      if (isNaN(chainIdNum) || chainIdNum <= 0) {
        errors.push('chainId must be a positive number')
      }
    }

    // Required: chainName
    if (!chainConfig.chainName || typeof chainConfig.chainName !== 'string' || chainConfig.chainName.trim().length === 0) {
      errors.push('chainName is required and must be a non-empty string')
    }

    // Required: nativeCurrency (with name, symbol, decimals)
    if (!chainConfig.nativeCurrency) {
      errors.push('nativeCurrency is required')
    } else {
      const currency = chainConfig.nativeCurrency

      if (!currency.name || typeof currency.name !== 'string' || currency.name.trim().length === 0) {
        errors.push('nativeCurrency.name is required and must be a non-empty string')
      }

      if (!currency.symbol || typeof currency.symbol !== 'string' || currency.symbol.trim().length === 0) {
        errors.push('nativeCurrency.symbol is required and must be a non-empty string')
      }

      if (!currency.decimals || typeof currency.decimals !== 'number' || currency.decimals < 0 || currency.decimals > 18) {
        errors.push('nativeCurrency.decimals must be a number between 0 and 18')
      }
    }

    // Required: rpcUrls (array of strings)
    if (!chainConfig.rpcUrls || !Array.isArray(chainConfig.rpcUrls) || chainConfig.rpcUrls.length === 0) {
      errors.push('rpcUrls is required and must be a non-empty array')
    } else {
      // Check if all rpcUrls are valid strings
      const invalidUrls = chainConfig.rpcUrls.filter((url: any) =>
        !url || typeof url !== 'string' || !url.trim() || !this.isValidUrl(url.trim())
      )
      if (invalidUrls.length > 0) {
        errors.push('rpcUrls must contain valid URLs')
      }
    }

    // Optional: blockExplorerUrls (if provided, must be array of strings)
    if (chainConfig.blockExplorerUrls !== undefined) {
      if (!Array.isArray(chainConfig.blockExplorerUrls)) {
        errors.push('blockExplorerUrls must be an array')
      } else {
        const invalidUrls = chainConfig.blockExplorerUrls.filter((url: any) =>
          url && (typeof url !== 'string' || !this.isValidUrl(url.trim()))
        )
        if (invalidUrls.length > 0) {
          errors.push('blockExplorerUrls must contain valid URLs')
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Simple URL validation helper
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Add Ethereum chain
   */
  private async addChain(params: any): Promise<null> {
    const [chainConfig] = params

    console.log('[Background] Add chain request:', chainConfig)

    // Validate chain configuration according to MetaMask specification
    const validation = this.validateChainConfig(chainConfig)
    if (!validation.isValid) {
      throw ethErrors.rpc.invalidParams({
        message: `Invalid chain configuration: ${validation.errors.join(', ')}`
      })
    }

    // Convert hex chainId to number
    const chainIdNum = typeof chainConfig.chainId === 'string'
      ? parseInt(chainConfig.chainId, 16)
      : chainConfig.chainId

    // Check if chain is already supported (predefined chains)
    const existingChain = getChainById(chainIdNum)
    if (existingChain) {
      // Chain already exists, just switch to it
      await saveSelectedNetwork(chainIdNum)
      await this.emitChainChanged(chainIdNum)
      return null
    }

    // Check if custom network with this chainId already exists
    const existingCustomNetwork = await getCustomNetworkByChainId(chainIdNum)
    if (existingCustomNetwork) {
      // Custom chain already exists, just switch to it
      await saveSelectedNetwork(chainIdNum)
      await this.emitChainChanged(chainIdNum)
      return null
    }

    // New network - show approval popup
    await this.showApprovalPopup('addNetwork', {
      chainConfig: {
        chainId: chainIdNum,
        chainName: chainConfig.chainName,
        nativeCurrency: chainConfig.nativeCurrency,
        rpcUrls: chainConfig.rpcUrls,
        blockExplorerUrls: chainConfig.blockExplorerUrls,
      }
    })

    // Create and save the custom network
    const customNetwork = {
      id: `custom_${chainIdNum}_${Date.now()}`,
      name: chainConfig.chainName,
      chainId: chainIdNum,
      rpcUrl: chainConfig.rpcUrls[0], // Use first RPC URL
      currency: chainConfig.nativeCurrency,
      blockExplorerUrl: chainConfig.blockExplorerUrls?.[0], // Optional first block explorer URL
      isActive: true,
      dateAdded: Date.now(),
      status: 'checking' as const,
    }

    // Save to storage
    await saveCustomNetwork(customNetwork)

    // Switch to the newly added network
    await saveSelectedNetwork(chainIdNum)
    await this.emitChainChanged(chainIdNum)

    return null
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
   * Request permissions from user
   */
  private async requestPermissions(params: any, context: RequestContext): Promise<any[]> {
    const requestedPermissions: Permission[] = params || []
    console.log('[Background] Request permissions:', requestedPermissions, context.origin, params)

    // Filter out unsupported permissions
    const supportedPermissions = requestedPermissions.filter((permission: Permission) =>
      ['eth_accounts', 'eth_sendTransaction', 'personal_sign'].includes(permission.parentCapability)
    )

    if (supportedPermissions.length === 0) {
      return []
    }

    // Check if already connected
    const isConnected = await this.isOriginConnected(context.origin)

    if (isConnected) {
      // Return existing permissions for connected dApp
      return this.getExistingPermissions(context.origin)
    }

    // Get active account for approval
    const activeAccount = await getActiveAccount()
    if (!activeAccount) {
      throw ethErrors.rpc.internal({
        message: 'No account available. Please create an account first.'
      })
    }

    // Show approval popup for permissions
    await this.showApprovalPopup('permissions', {
      permissions: supportedPermissions,
      origin: context.origin,
      url: context.url,
    })

    // Grant permissions - store connection
    await this.saveConnection(context.origin, [activeAccount.address])

    // Return granted permissions
    const grantedPermissions = supportedPermissions.map(permission => ({
      ...permission,
      invoker: context.origin,
      date: Date.now(),
    }))

    // Notify about account change
    this.broadcastEvent('accountsChanged', [activeAccount.address], context.origin)

    return grantedPermissions
  }

  /**
   * Revoke permissions from a DApp
   */
  private async revokePermissions(params: any, context: RequestContext): Promise<void> {
    const [permissionsToRevoke] = params
    console.log('[Background] Revoke permissions:', permissionsToRevoke, context.origin)

    try {
      // Disconnect the DApp completely
      const { disconnectDApp } = await import('~services/connectedDApps')
      await disconnectDApp(context.origin)

      // Notify about account change (empty accounts = disconnected)
      this.broadcastEvent('accountsChanged', [], context.origin)

    } catch (error) {
      console.error('[Background] Failed to revoke permissions:', error)
      throw ethErrors.rpc.internal({
        message: `Failed to revoke permissions: ${error.message}`
      })
    }
  }

  /**
   * Get current permissions for the requesting origin
   */
  private async getPermissions(context: RequestContext): Promise<any[]> {
    const isConnected = await this.isOriginConnected(context.origin)

    if (!isConnected) {
      return []
    }

    return this.getExistingPermissions(context.origin)
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
   * Watch Asset (EIP-747)
   * Allows dApps to request the wallet to track a token asset
   */
  private async watchAsset(params: any, context: RequestContext): Promise<boolean> {
    const [assetData] = params

    console.log('[Background] Watch asset request:', assetData, 'from:', context.origin)

    // Validate asset data according to EIP-747
    if (!assetData || typeof assetData !== 'object') {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid asset data: must be an object'
      })
    }

    if (assetData.type !== 'ERC20') {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid asset type: only ERC20 tokens are supported'
      })
    }

    const { options } = assetData
    if (!options || typeof options !== 'object') {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid asset options: must be an object'
      })
    }

    const { address, symbol, decimals: decimalsStr, image } = options

    // Validate required fields
    if (!address || typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid address: must be a valid Ethereum address'
      })
    }

    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid symbol: must be a non-empty string'
      })
    }

    // Parse decimals (can be string or number from different dApps)
    let decimalsNum: number
    if (typeof decimalsStr === 'string') {
      decimalsNum = parseInt(decimalsStr, 10)
    } else if (typeof decimalsStr === 'number') {
      decimalsNum = decimalsStr
    } else {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid decimals: must be a number or string representing a number'
      })
    }

    // Validate parsed decimals
    if (isNaN(decimalsNum) || !Number.isInteger(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
      throw ethErrors.rpc.invalidParams({
        message: 'Invalid decimals: must be an integer between 0 and 18'
      })
    }

    // Get current chain ID for network-specific token storage
    const chainIdStr = await this.getChainId(context)
    const chainId = parseInt(chainIdStr, 16)

    console.log('[Background] Adding token to chain:', chainId, 'symbol:', symbol)

    try {
      // Use Plasmo Storage API (already imported at top of file)
      const storage = new Storage()

      // Storage key for custom tokens (matching customTokens.ts)
      const CUSTOM_TOKENS_STORAGE_KEY = 'smart-wallet-pro-custom-tokens'

      // Get existing tokens from storage
      const stored = await storage.get(CUSTOM_TOKENS_STORAGE_KEY)
      const allTokens = stored ? stored : {}

      // Ensure chainId key exists
      if (!allTokens[chainId]) {
        allTokens[chainId] = []
      }

      // Check if token already exists
      const existingTokens = allTokens[chainId]
      const alreadyExists = existingTokens.some(
        (token: any) => token.address.toLowerCase() === address.toLowerCase()
      )

      if (alreadyExists) {
        console.log('[Background] Token already being watched, skipping:', address)
        return true // Return success as per EIP-747
      }

      // Add the token
      const tokenData = {
        address: address.toLowerCase(),
        symbol: symbol.toUpperCase(), // Normalize symbol to uppercase
        decimals: decimalsNum,
        name: symbol, // Use symbol as name for now
        chainId,
        addedAt: Date.now()
      }

      allTokens[chainId].push(tokenData)

      // Save back to storage (Plasmo should sync this to UI)
      await storage.set(CUSTOM_TOKENS_STORAGE_KEY, allTokens)

      console.log('[Background] Token added successfully:', symbol, address)

      // TODO: Explicitly notify UI components about new token addition
      // Could broadcast via runtime messaging or use storage-sync mechanism

      return true
    } catch (error) {
      console.error('[Background] Failed to add custom token:', error)
      throw ethErrors.rpc.internal({
        message: `Failed to watch asset: ${error.message}`
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



  private async isOriginConnected(origin: string): Promise<boolean> {
    console.log('[Background] Checking if origin is connected:', origin);
    const { isOriginConnected } = await import('~services/connectedDApps')
    return await isOriginConnected(origin)
  }

  private async saveConnection(origin: string, accounts: string[]): Promise<void> {
    // await browser.storage.local.set({
    //   [`connected_${origin}`]: {
    //     accounts,
    //     timestamp: Date.now(),
    //   },
    // });
    const { connectDApp } = await import('~services/connectedDApps')
    await connectDApp(origin, accounts)
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

  /**
   * Get existing permissions for a connected origin
   */
  private getExistingPermissions(origin: string): any[] {
    // Return standard permission set for connected dApps
    return [
      {
        parentCapability: 'eth_accounts',
        caveats: [],
        invoker: origin,
        date: Date.now(),
      },
      {
        parentCapability: 'eth_sendTransaction',
        caveats: [],
        invoker: origin,
        date: Date.now(),
      },
      {
        parentCapability: 'personal_sign',
        caveats: [],
        invoker: origin,
        date: Date.now(),
      }
    ]
  }

  /**
   * Try to open unlock popup and queue request simultaneously
   * Returns a promise that resolves when wallet is unlocked and request is processed
   */
  private async popAndQueueForUnlock(method: string, context: RequestContext): Promise<any> {
    console.log('[Background] Auto-popup unlock + queuing connection request')

    // Prevent multiple simultaneous unlock flows
    if (this.pendingConnectionRequest) {
      console.log('[Background] Unlock flow already in progress, rejecting duplicate request')
      throw ethErrors.provider.userRejectedRequest({
        message: 'Another unlock request is in progress. Please complete the current request first.'
      })
    }

    // Start polling in background first
    const unlockPromise = this.pollAndProcessConnection()

    // Try different popup methods to open unlock UI
    try {
      const unlockUrl = browser.runtime.getURL('/tabs/unlock.html?auto=true')

      // Method 1: Try popup window (best UX, least intrusive)
      try {
        await browser.windows.create({
          url: unlockUrl,
          type: 'popup',
          width: 375,
          height: 600,
          focused: true  // Immediately shown to user
        })
        console.log('[Background] Auto-popup opened successfully')
      } catch (popupError) {
        console.warn('[Background] Popup failed:', popupError.message)

        // Method 2: Fallback to tab (more intrusive but works)
        try {
          await browser.tabs.create({
            url: unlockUrl,
            active: true
          })
          console.log('[Background] Auto-tab opened successfully')
        } catch (tabError) {
          console.error('[Background] Tab fallback also failed:', tabError.message)
          // Continue with polling only
        }
      }
    } catch (error) {
      console.error('[Background] All auto-open methods failed:', error.message)
      // Continue with polling only
    }

    // Wait for unlock to complete, then process the request
    return new Promise((resolve, reject) => {
      this.pendingConnectionRequest = {
        resolve,
        reject,
        context,
        method
      }

      // Set timeout for the entire operation
      setTimeout(() => {
        if (this.pendingConnectionRequest) {
          console.log('[Background] Unlock operation timed out')
          const request = this.pendingConnectionRequest
          request.reject(ethErrors.provider.userRejectedRequest({
            message: 'Unlock operation timed out. Please try again.'
          }))
          this.pendingConnectionRequest = null
        }
      }, 5 * 60 * 1000) // 5 minutes
    })
  }

  /**
   * Poll for unlock and process queued connection request
   */
  private async pollAndProcessConnection(): Promise<void> {
    const pollInterval = 500 // Check every 500 ms

    const poll = async () => {
      try {
        const locked = await isWalletLocked()
        if (!locked && this.pendingConnectionRequest) {
          console.log('[Background] Wallet unlocked - processing queued connection request')

          const { resolve, context, method } = this.pendingConnectionRequest

          // Process the original RPC request now that wallet is unlocked
          try {
            const result = await this.handleRPCRequest({ method, params: [] }, context)
            resolve(result)
          } catch (error) {
            this.pendingConnectionRequest.reject(error)
          }

          // Clear the pending request
          this.pendingConnectionRequest = null

        } else if (this.pendingConnectionRequest) {
          // Continue polling if still locked and request pending
          setTimeout(poll, pollInterval)
        }
      } catch (error) {
        console.error('[Background] Error polling for unlock:', error)
        // If polling fails, clear the request
        if (this.pendingConnectionRequest) {
          this.pendingConnectionRequest.reject(error)
          this.pendingConnectionRequest = null
        }
      }
    }

    // Start polling
    poll()

    // Set timeout (5 minutes)
    setTimeout(() => {
      if (this.pendingConnectionRequest) {
        console.log('[Background] Connection request timed out')
        this.pendingConnectionRequest.reject(
          ethErrors.provider.userRejectedRequest({
            message: 'Connection request timed out. Please try again.'
          })
        )
        this.pendingConnectionRequest = null
      }
    }, 5 * 60 * 1000)
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

// Initialize connected dApps from legacy storage (one-time migration)
;(async () => {
  const { migrateLegacyConnections } = await import('~services/connectedDApps')
  try {
    await migrateLegacyConnections()
    console.log('[Background] Legacy connections migration completed')
  } catch (error) {
    console.warn('[Background] Legacy connections migration failed:', error)
  }
})()

// Initialize and start auto-lock timer
const controller = new Index()

// Start auto-lock timer
startAutoLockTimer()

console.log('[Background] Provider controller initialized with security features and network health monitoring')

// Initialize transaction status monitor FIRST (before other services in case any fail)
console.log('[Background] 🚀 STARTING CRITICAL TRANSACTION MONITORING')
try {
  console.log('[Background] Importing TransactionStatusMonitor...')
  // const { TransactionStatusMonitor } = await import("~/services/transactionStatusMonitor")
  console.log('[Background] ✅ TransactionStatusMonitor imported successfully')

  console.log('[Background] Getting instance...')
  const monitor = TransactionStatusMonitor.getInstance()
  console.log('[Background] ✅ Got TransactionStatusMonitor instance')

  console.log('[Background] Starting monitoring...')
  // await monitor.startMonitoring()
  monitor
    .startMonitoring()
    .then(r => console.log("[Background] Status Monitoring started"))
    .catch(err => console.log("[Background] Start Status Monitoring failed"))
  console.log('[Background] ✅ TRANSACTION STATUS MONITOR STARTED SUCCESSFULLY!')

} catch (error) {
  console.error('[Background] 🚨 FATAL: Transaction status monitor startup FAILED:', error)
  console.error('[Background] Error details:', error.message, error.stack)
}

// Initialize network health monitor (after transaction monitoring to isolate issues)
networkHealthMonitor.startMonitoring().catch(error => {
  console.error('[Background] Failed to start network health monitoring:', error)
})

// Plasmo-compatible Service Worker Keepalive
// Keeps service worker alive using Plasmo's storage API
const storage = new Storage({ area: "local" })
setInterval(async () => {
  try {
    await storage.set("plasmo_keepalive", Date.now())
  } catch (error) {
    console.warn('[Background] Keepalive storage failed:', error.message)
  }
}, 30000) // Every 30 seconds

console.log('[Background] Service worker keepalive initialized')

export default controller
