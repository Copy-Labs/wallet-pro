// EIP-6963 compatible Ethereum Provider
export class EthereumProvider {
  public isMetaMask = false
  public isSmartWalletPro = true
  public isConnected = false

  private _listeners: { [event: string]: ((...args: any[]) => void)[] } = {}
  private _chainId: string = "0x1" // Default to mainnet
  private _selectedAddress: string | null = null
  private _isEnabled = false
  private _messageId = 0

  constructor() {
    this._setupMessageListener()
  }

  // EIP-1193 required methods
  async request(request: { method: string; params?: any[] }): Promise<any> {
    const id = ++this._messageId

    console.log('🔵 Smart Wallet - Intercepting request:', request.method, { id })

    // For EIP-6963, handle requests appropriately
    if (request.method === "eth_requestAccounts") {
      // Trigger the wallet chooser by dispatching EIP-6963 request event
      window.dispatchEvent(new CustomEvent("eip6963:requestProvider", {
        detail: { requestedBy: window.location.origin }
      }))

      // Return a promise that will be resolved when user selects our wallet
      return new Promise((resolve, reject) => {
        const handleSelection = (event: any) => {
          if (event.detail?.walletId === 'smart-wallet-pro') {
            // User selected us - resolve with our accounts
            resolve([this._selectedAddress || "0x0000000000000000000000000000000000000000"])
            window.removeEventListener("smart-wallet-selected", handleSelection)
          } else if (event.detail?.walletId) {
            // User selected another wallet
            reject(new Error("User selected another wallet"))
            window.removeEventListener("smart-wallet-selected", handleSelection)
          }
        }

        window.addEventListener("smart-wallet-selected", handleSelection)

        // Timeout after 5 minutes
        setTimeout(() => {
          window.removeEventListener("smart-wallet-selected", handleSelection)
          reject(new Error("Wallet selection timeout"))
        }, 300000)
      })
    }

    // Handle other request types here...

    return Promise.reject(new Error("Method not implemented"))
  }

  // Legacy MetaMask methods
  async enable(): Promise<string[]> {
    return this.request({ method: 'eth_requestAccounts', params: [] }) as Promise<string[]>
  }

  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this._listeners[event]) {
      this._listeners[event] = []
    }
    this._listeners[event].push(listener)
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (!this._listeners[event]) return

    this._listeners[event] = this._listeners[event].filter(l => l !== listener)
  }

  removeListener(event: string, listener: (...args: any[]) => void): void {
    this.off(event, listener)
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this._listeners[event]
    } else {
      this._listeners = {}
    }
  }

  // Getters for provider info
  get chainId(): string {
    return this._chainId
  }

  get selectedAddress(): string | null {
    return this._selectedAddress
  }

  get networkVersion(): string {
    return parseInt(this._chainId, 16).toString()
  }

  // Set account (called when wallet is selected)
  setSelectedAddress(address: string) {
    this._selectedAddress = address
    this._isEnabled = true
    this.isConnected = true

    this._emit("accountsChanged", [address])
    this._emit("connect", { chainId: this._chainId })

    // Dispatch event to resolve any pending requests
    window.dispatchEvent(new CustomEvent("smart-wallet-selected", {
      detail: { walletId: 'smart-wallet-pro', address }
    }))
  }

  // Initialize connection status
  private _setupMessageListener(): void {
    // Listen for provider updates from background/extension
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "PROVIDER_UPDATE") {
        if (event.data.chainId) {
          this._chainId = event.data.chainId
          this._emit("chainChanged", this._chainId)
        }
        if (event.data.selectedAddress !== undefined) {
          this._selectedAddress = event.data.selectedAddress
          this._emit("accountsChanged", this._selectedAddress ? [this._selectedAddress] : [])
        }
      }
    })
  }

  private _emit(event: string, ...args: any[]): void {
    if (!this._listeners[event]) return

    this._listeners[event].forEach(listener => {
      try {
        listener(...args)
      } catch (error) {
        console.error("Error in event listener:", error)
      }
    })
  }
}
