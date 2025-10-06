// EIP-1193 Ethereum Provider implementation
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

    return new Promise((resolve, reject) => {
      const message = {
        type: "ETH_REQUEST",
        id,
        request,
        origin: window.location.origin
      }

      // Send to content script
      window.postMessage(message, "*")

      // Set up response listener for this specific request
      const responseHandler = (event: MessageEvent) => {
        if (event.data && event.data.type === "ETH_RESPONSE" && event.data.id === id) {
          window.removeEventListener("message", responseHandler)

          if (event.data.error) {
            reject(new Error(event.data.error.message || "Request rejected"))
          } else {
            resolve(event.data.result)
          }
        }
      }

      window.addEventListener("message", responseHandler)

      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener("message", responseHandler)
        reject(new Error("Request timeout"))
      }, 300000)
    })
  }

  // Legacy MetaMask methods
  async enable(): Promise<string[]> {
    if (this._isEnabled) {
      return this._selectedAddress ? [this._selectedAddress] : []
    }

    try {
      const accounts = await this.request({
        method: "eth_requestAccounts",
        params: []
      }) as string[]

      this._selectedAddress = accounts[0] || null
      this._isEnabled = true
      this.isConnected = true

      this._emit("connect", { chainId: this._chainId })
      return accounts
    } catch (error) {
      this._isEnabled = false
      this._selectedAddress = null
      throw error
    }
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

  // Initialize connection status
  private _setupMessageListener(): void {
    // Listen for provider messages
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
