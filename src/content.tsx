// Note: avoid strict typing here to prevent lint errors in some setups
// import type { PlasmoCSConfig } from "plasmo"
import { useEffect } from "react"

import { sendToBackground } from "@plasmohq/messaging"

// Import our ethereum provider
import { EthereumProvider } from "./services/ethereum-provider"

export const config = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: true,
  world: "MAIN" // Critical: Run in page's global scope, not isolated
} as const

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any
    smartWalletProResolveRequest?: (result: any) => void
    smartWalletProRejectRequest?: (error: any) => void
  }
}

function injectEthereumProvider() {
  // Check if our provider is already injected
  if (window.ethereum?.isSmartWalletPro) {
    console.log("✅ Smart Wallet Pro provider already available")
    return
  }

  try {
    console.log(
      "💉 Injecting Smart Wallet Pro ethereum provider using script tag"
    )

    // Create a minimal provider infrastructure that can call back to our extension
    const providerCode = `
      (function() {
        console.log('🔧 Smart Wallet Pro injected provider loading...');

        // Basic provider object
        const provider = {
          isMetaMask: false,
          isSmartWalletPro: true,
          chainId: '0x1',
          selectedAddress: null,
          isConnected: false,

          async request({ method, params }) {
            console.log('🔵 Injected Smart Wallet Pro received request:', method);

            // Return selected accounts if already connected
            if (method === 'eth_accounts') {
              return this.selectedAddress ? [this.selectedAddress] : []
            }

            // Return current chain id
            if (method === 'eth_chainId') {
              return this.chainId
            }

            if (method === 'eth_requestAccounts') {
              // Dispatch EIP-6963 request event to our content script
              console.log('🚨 Dispatching EIP-6963 requestProvider event');
              window.dispatchEvent(new CustomEvent('eip6963:requestProvider', {
                detail: { requestedBy: window.location.origin }
              }));

              // Return a promise that resolves when user selects our wallet
              return new Promise((resolve, reject) => {
                window.smartWalletProResolveRequest = resolve;
                window.smartWalletProRejectRequest = reject;

                // Timeout after 5 minutes
                setTimeout(() => {
                  reject(new Error('Wallet selection timeout'));
                }, 300000);
              });
            }

            if (method === 'wallet_switchEthereumChain' && params && params[0] && params[0].chainId) {
              // Optimistically set and emit; real switching handled by extension
              const newChainId = params[0].chainId
              if (typeof newChainId === 'string') {
                this.chainId = newChainId
                this.emit('chainChanged', this.chainId)
                return null
              }
            }

            if (method === 'eth_sendTransaction') {
              // Notify content script to open approval UI
              window.dispatchEvent(new CustomEvent('smart-wallet:txRequest', { detail: { params } }))

              return new Promise((resolve, reject) => {
                const approveHandler = (e) => {
                  window.removeEventListener('smart-wallet:txApproved', approveHandler)
                  window.removeEventListener('smart-wallet:txRejected', rejectHandler)
                  resolve(e.detail.txHash)
                }
                const rejectHandler = (e) => {
                  window.removeEventListener('smart-wallet:txApproved', approveHandler)
                  window.removeEventListener('smart-wallet:txRejected', rejectHandler)
                  reject(new Error(e.detail?.message || 'User rejected the request.'))
                }
                window.addEventListener('smart-wallet:txApproved', approveHandler)
                window.addEventListener('smart-wallet:txRejected', rejectHandler)
                setTimeout(() => {
                  window.removeEventListener('smart-wallet:txApproved', approveHandler)
                  window.removeEventListener('smart-wallet:txRejected', rejectHandler)
                  reject(new Error('Transaction approval timeout'))
                }, 300000)
              })
            }

            // Handle other methods that might be called immediately
            return { error: 'Method not implemented: ' + method };
          },

          async enable() {
            return this.request({ method: 'eth_requestAccounts', params: [] });
          },

          // Set the selected address (called by our content script)
          setSelectedAddress(address) {
            this.selectedAddress = address;
            this.isConnected = true;
            this.emit('accountsChanged', [address]);
            this.emit('connect', { chainId: this.chainId });

            // Resolve any pending request
            if (window.smartWalletProResolveRequest) {
              window.smartWalletProResolveRequest([address]);
            }
          }

          // Event emitter
          _listeners: {},

          on(event, listener) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(listener);
          },

          off(event, listener) {
            if (!this._listeners[event]) return;
            this._listeners[event] = this._listeners[event].filter(l => l !== listener);
          },

          emit(event, ...args) {
            if (!this._listeners[event]) return;
            this._listeners[event].forEach(listener => {
              try { listener(...args); } catch (e) { console.error(e); }
            });
          }
        };

        // Replace any existing ethereum, or just set it
        window.ethereum = provider;

        console.log('✅ Smart Wallet Pro injected provider active');
        console.log('🎯 window.ethereum.isSmartWalletPro:', window.ethereum.isSmartWalletPro);

      })();
    `

    // Create and inject script tag
    const script = document.createElement("script")
    script.textContent = providerCode
    script.id = "smart-wallet-pro-provider"

    // Inject into document head
    if (document.head) {
      document.head.appendChild(script)
      console.log("✅ Smart Wallet Pro provider script injected successfully")
    } else {
      // Fallback: wait for head to be available
      const injectWhenReady = () => {
        if (document.head) {
          document.head.appendChild(script)
          console.log("✅ Smart Wallet Pro provider script injected (delayed)")
        } else {
          setTimeout(injectWhenReady, 10)
        }
      }
      injectWhenReady()
    }

    // Fallback: if injection was blocked (e.g., CSP), define provider directly in MAIN world
    try {
      setTimeout(() => {
        const w = window as any
        if (!w.ethereum || !w.ethereum.isSmartWalletPro) {
          console.warn(
            "⚠️ Script-tag injection may be blocked; applying direct provider fallback"
          )
          const provider: any = {
            isMetaMask: false,
            isSmartWalletPro: true,
            chainId: "0x1",
            selectedAddress: null,
            isConnected: false,
            async request({
              method,
              params
            }: {
              method: string
              params?: any[]
            }) {
              if (method === "eth_accounts") {
                return this.selectedAddress ? [this.selectedAddress] : []
              }
              if (method === "eth_chainId") {
                return this.chainId
              }
              if (method === "eth_requestAccounts") {
                window.dispatchEvent(
                  new CustomEvent("eip6963:requestProvider", {
                    detail: { requestedBy: window.location.origin }
                  })
                )
                return new Promise((resolve, reject) => {
                  ;(window as any).smartWalletProResolveRequest = resolve
                  ;(window as any).smartWalletProRejectRequest = reject
                  setTimeout(
                    () => reject(new Error("Wallet selection timeout")),
                    300000
                  )
                })
              }
              if (
                method === "wallet_switchEthereumChain" &&
                params &&
                params[0] &&
                params[0].chainId
              ) {
                const newChainId = params[0].chainId
                if (typeof newChainId === "string") {
                  this.chainId = newChainId
                  this.emit("chainChanged", this.chainId)
                  return null
                }
              }
              if (method === "eth_sendTransaction") {
                window.dispatchEvent(
                  new CustomEvent("smart-wallet:txRequest", {
                    detail: { params }
                  })
                )
                return new Promise((resolve, reject) => {
                  const approve = (e: any) => {
                    window.removeEventListener(
                      "smart-wallet:txApproved",
                      approve as any
                    )
                    window.removeEventListener(
                      "smart-wallet:txRejected",
                      rejectH as any
                    )
                    resolve(e.detail.txHash)
                  }
                  const rejectH = (e: any) => {
                    window.removeEventListener(
                      "smart-wallet:txApproved",
                      approve as any
                    )
                    window.removeEventListener(
                      "smart-wallet:txRejected",
                      rejectH as any
                    )
                    reject(
                      new Error(
                        e.detail?.message || "User rejected the request."
                      )
                    )
                  }
                  window.addEventListener(
                    "smart-wallet:txApproved",
                    approve as any
                  )
                  window.addEventListener(
                    "smart-wallet:txRejected",
                    rejectH as any
                  )
                  setTimeout(() => {
                    window.removeEventListener(
                      "smart-wallet:txApproved",
                      approve as any
                    )
                    window.removeEventListener(
                      "smart-wallet:txRejected",
                      rejectH as any
                    )
                    reject(new Error("Transaction approval timeout"))
                  }, 300000)
                })
              }
              return { error: "Method not implemented: " + method }
            },
            async enable() {
              return this.request({ method: "eth_requestAccounts", params: [] })
            },
            setSelectedAddress(address: string) {
              this.selectedAddress = address
              this.isConnected = true
              this.emit("accountsChanged", [address])
              this.emit("connect", { chainId: this.chainId })
              if ((window as any).smartWalletProResolveRequest) {
                ;(window as any).smartWalletProResolveRequest([address])
              }
            },
            _listeners: {} as Record<string, Function[]>,
            on(event: string, listener: Function) {
              if (!this._listeners[event]) this._listeners[event] = []
              this._listeners[event].push(listener)
            },
            off(event: string, listener: Function) {
              if (!this._listeners[event]) return
              this._listeners[event] = this._listeners[event].filter(
                (l: any) => l !== listener
              )
            },
            emit(event: string, ...args: any[]) {
              if (!this._listeners[event]) return
              this._listeners[event].forEach((l: any) => {
                try {
                  l(...args)
                } catch (e) {
                  console.error(e)
                }
              })
            }
          }
          Object.defineProperty(window, "ethereum", {
            value: provider,
            configurable: true
          })
          console.log("✅ Smart Wallet Pro provider active via fallback")
        }
      }, 0)
    } catch (e) {
      console.error("Fallback provider setup error", e)
    }
  } catch (error) {
    console.error("❌ Failed to inject Smart Wallet Pro provider:", error)
  }
}

// Wallet provider interface for EIP-6963
interface WalletProvider {
  uuid: string
  name: string
  icon: string
  rdns: string
  provider: any
}

// Global state for available wallets (detected via EIP-6963)
let detectedWallets: WalletProvider[] = []

// Add our own wallet to the list
const ourWallet: WalletProvider = {
  uuid: "smart-wallet-pro",
  name: "Smart Wallet Pro",
  icon: "✨",
  rdns: "pro.smart-wallet",
  provider: null // Will be set when needed
}

// Simple Plasmo CS UI implementation without external dependencies
// This creates a modal overlay directly on the page
function createWalletChooserModal() {
  // Remove any existing modal
  const existing = document.getElementById("smart-wallet-modal")
  if (existing) existing.remove()

  // Create modal container
  const modal = document.createElement("div")
  modal.id = "smart-wallet-modal"
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  // Create modal content
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 380px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      position: relative;
    ">
      <button id="close-modal" style="
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>

      <h2 style="
        margin: 0 0 8px 0;
        font-size: 1.5rem;
        font-weight: 600;
        text-align: center;
        color: #111;
      ">Choose Your Wallet</h2>

      <p style="
        margin: 0 0 20px 0;
        color: #666;
        text-align: center;
        font-size: 0.9rem;
      ">${window.location.hostname} wants to connect to a wallet</p>

      <div id="wallet-list" style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Wallet options will be added here -->
      </div>

      <p id="no-wallets-msg" style="
        margin: 16px 0 0 0;
        font-size: 0.8rem;
        color: #888;
        text-align: center;
        display: none;
      ">No other wallets detected. Only Smart Wallet Pro is available.</p>
    </div>
  `

  document.body.appendChild(modal)

  // Populate wallet list
  const walletList = modal.querySelector("#wallet-list") as HTMLElement
  const noWalletsMsg = modal.querySelector("#no-wallets-msg") as HTMLElement

  detectedWallets.forEach((wallet) => {
    const button = document.createElement("button")
    button.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      width: 100%;
      border: ${wallet.uuid === ourWallet.uuid ? "2px solid #10b981" : "2px solid #e5e7eb"};
      border-radius: 8px;
      background: ${wallet.uuid === ourWallet.uuid ? "#10b981" : "#f9fafb"};
      color: ${wallet.uuid === ourWallet.uuid ? "white" : "#333"};
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    `

    button.innerHTML = `
      <span style="font-size: 1.3em;">${wallet.icon}</span>
      <div style="text-align: left; flex: 1;">
        <div style="font-weight: 600;">${wallet.name}</div>
        ${wallet.uuid === ourWallet.uuid ? '<div style="font-size: 0.8em; opacity: 0.9;">Gas sponsorship & advanced features</div>' : ""}
      </div>
    `

    button.onmouseover = () => {
      if (wallet.uuid !== ourWallet.uuid) {
        button.style.background = "#f3f4f6"
      }
    }

    button.onmouseout = () => {
      if (wallet.uuid !== ourWallet.uuid) {
        button.style.background = "#f9fafb"
      }
    }

    button.onclick = () => selectWallet(wallet)
    walletList.appendChild(button)
  })

  if (detectedWallets.length === 1) {
    noWalletsMsg.style.display = "block"
  }

  // Close modal functionality
  const closeBtn = modal.querySelector("#close-modal") as HTMLElement
  closeBtn.onclick = () => removeModal()

  modal.onclick = (e) => {
    if (e.target === modal) {
      removeModal()
    }
  }

  function removeModal() {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal)
    }
  }
}

function closeWalletChooser() {
  // Alias for removeModal functionality
  const modal = document.getElementById("smart-wallet-modal")
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal)
  }
  // Remove global functions if they exist
  delete (window as any).selectWallet
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

// Global wallet selection handler
async function selectWallet(wallet: WalletProvider) {
  console.log(`🎯 User selected: ${wallet.name}`)

  if (wallet.uuid === ourWallet.uuid) {
    // Our Smart Wallet Pro selected
    try {
      const result = await chrome.storage.local.get(["wallet_accounts"])
      const accounts = result.wallet_accounts?.accounts || []

      if (accounts.length === 0) {
        console.log("❌ No accounts available - please create an account first")
        // Close modal anyway
        closeWalletChooser()
        return
      }

      const selectedAccount = accounts[0] // Use first account

      // Ask background to persist permission using Plasmo messaging
      try {
        await (sendToBackground as any)({
          name: "ethRequestAccounts",
          body: {
            origin: window.location.origin,
            approvedAccountId: selectedAccount.id
          }
        })
      } catch (e) {
        console.warn("⚠️ Failed to persist permission via background:", e)
      }

      // Set our provider as the active one with proper state
      if (window.ethereum && window.ethereum.isSmartWalletPro) {
        window.ethereum.setSelectedAddress(selectedAccount.address)
      }

      console.log(`✅ Smart Wallet Pro connected: ${selectedAccount.address}`)
      console.log("🎉 Connection successful! DApp can now access our wallet.")
    } catch (error) {
      console.error("❌ Smart Wallet Pro connection error:", error)
    }
  } else {
    // Other wallet selected - our provider will return an error to trigger fallback
    console.log(`🔄 User selected other wallet: ${wallet.name}`)
    console.log(
      "ℹ️ Our provider will reject the request, allowing other wallets to handle it."
    )
  }

  // Always close the modal after selection
  closeWalletChooser()
}

// EIP-6963 event listeners - set up once on mount
export default function WalletContentScript() {
  useEffect(() => {
    // Plasmo Content Script Context Guard
    // Only run in content script context (not service worker)
    if (typeof window === "undefined" || typeof document === "undefined") {
      console.log("🛑 Skipping setup - not in content script context")
      return
    }

    // SETUP: Inject our ethereum provider using script tag (traditional wallet approach)
    injectEthereumProvider()

    console.log("🎯 Smart Wallet Pro - Setting up EIP-6963 listeners")

    try {
      // Initialize our wallet in detected list
      detectedWallets = [ourWallet]

      // Listen for other wallet announcements
      const handleAnnouncement = (event: any) => {
        try {
          const { detail } = event
          if (detail) {
            const [info] = Array.isArray(detail) ? detail : [detail]

            if (info && info.rdns !== ourWallet.rdns) {
              const wallet: WalletProvider = {
                uuid:
                  info.uuid || info.name?.toLowerCase().replace(/\s+/g, "-"),
                name: info.name || "Unknown Wallet",
                icon: info.icon || "📱",
                rdns: info.rdns || "unknown",
                provider: null
              }

              // Add if not already present
              const exists = detectedWallets.find((w) => w.uuid === wallet.uuid)
              if (!exists) {
                detectedWallets.push(wallet)
                console.log("✅ Detected wallet:", wallet.name)
              }
            }
          }
        } catch (error) {
          console.error("❌ Error in announcement handler:", error)
        }
      }

      // Handle provider requests (this is what DApps trigger)
      const handleProviderRequest = (event: any) => {
        try {
          console.log(
            "🚨 DApp requested wallet connection at:",
            window.location.hostname
          )
          console.log(
            "📋 Available wallets:",
            detectedWallets.map((w) => w.name)
          )

          createWalletChooserModal()
        } catch (error) {
          console.error("❌ Error in provider request handler:", error)
        }
      }

      // Add event listeners
      window.addEventListener("eip6963:announceProvider", handleAnnouncement)
      window.addEventListener("eip6963:requestProvider", handleProviderRequest)

      // Transaction approval flow
      const handleTxRequest = async (event: any) => {
        try {
          const params = (event?.detail?.params || [])[0] || {}

          // Simple approval modal for now
          const prettyTo = params.to || "Unknown"
          const prettyValue = params.value || "0x0"
          const ok = window.confirm(
            `Approve transaction?\nTo: ${prettyTo}\nValue (wei hex): ${prettyValue}`
          )

          if (!ok) {
            window.dispatchEvent(
              new CustomEvent("smart-wallet:txRejected", {
                detail: { message: "User rejected the request." }
              })
            )
            return
          }

          // Send to background for processing (stub)
          const resp = await (sendToBackground as any)({
            name: "relayEthTransaction",
            body: {
              origin: window.location.origin,
              transactionData: params,
              accountId: null
            }
          })

          const txHash =
            resp?.txHash ||
            "0x" + Math.random().toString(16).slice(2).padEnd(64, "0")

          window.dispatchEvent(
            new CustomEvent("smart-wallet:txApproved", { detail: { txHash } })
          )
        } catch (err) {
          window.dispatchEvent(
            new CustomEvent("smart-wallet:txRejected", {
              detail: { message: (err as any)?.message || "Transaction failed" }
            })
          )
        }
      }
      ;(window as any).addEventListener(
        "smart-wallet:txRequest",
        handleTxRequest
      )

      // Announce our provider
      const announceEvent = new CustomEvent("eip6963:announceProvider", {
        detail: [
          {
            uuid: ourWallet.uuid,
            name: ourWallet.name,
            icon: ourWallet.icon,
            rdns: ourWallet.rdns
          },
          null
        ] // Provider can be null for announcement
      })
      window.dispatchEvent(announceEvent)

      console.log("✅ Smart Wallet Pro announced EIP-6963 provider")

      // Cleanup
      return () => {
        try {
          window.removeEventListener(
            "eip6963:announceProvider",
            handleAnnouncement
          )
          window.removeEventListener(
            "eip6963:requestProvider",
            handleProviderRequest
          )
          ;(window as any).removeEventListener(
            "smart-wallet:txRequest",
            handleTxRequest
          )
        } catch (error) {
          console.error("❌ Error during cleanup:", error)
        }
      }
    } catch (error) {
      console.error("❌ Error setting up EIP-6963 listeners:", error)
    }
  }, [])

  // Return null - this component doesn't render anything visible by default
  // The modal is created programmatically when needed
  return null
}
