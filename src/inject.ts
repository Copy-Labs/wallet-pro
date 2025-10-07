// Plasmo plain content script running in the page's MAIN world to attach window.ethereum
// Runs as early as possible

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["<all_urls>"],
    run_at: "document_start",
    all_frames: true,
    world: "MAIN"
}

// Inject a script tag that defines window.ethereum if not already present
const code = `
  (function(){
    try {
      if (window.ethereum && window.ethereum.isSmartWalletPro) {
        return;
      }
      const already = document.getElementById('smart-wallet-pro-provider');
      if (already) return;
      const providerScript = document.createElement('script');
      providerScript.id = 'smart-wallet-pro-provider';
      providerScript.textContent = ` + "`" + `
        (function() {
          if (window.ethereum && window.ethereum.isSmartWalletPro) return;
          const provider = {
            isMetaMask: false,
            isSmartWalletPro: true,
            chainId: '0x1',
            selectedAddress: null,
            isConnected: false,
            async request({ method, params }) {
              if (method === 'eth_accounts') {
                return this.selectedAddress ? [this.selectedAddress] : []
              }
              if (method === 'eth_chainId') {
                return this.chainId
              }
              if (method === 'eth_requestAccounts') {
                window.dispatchEvent(new CustomEvent('eip6963:requestProvider', { detail: { requestedBy: window.location.origin } }))
                return new Promise((resolve, reject) => {
                  window.smartWalletProResolveRequest = resolve
                  window.smartWalletProRejectRequest = reject
                  setTimeout(() => reject(new Error('Wallet selection timeout')), 300000)
                })
              }
              if (method === 'wallet_switchEthereumChain' && params && params[0] && params[0].chainId) {
                const newChainId = params[0].chainId
                if (typeof newChainId === 'string') {
                  this.chainId = newChainId
                  this.emit('chainChanged', this.chainId)
                  return null
                }
              }
              if (method === 'eth_sendTransaction') {
                window.dispatchEvent(new CustomEvent('smart-wallet:txRequest', { detail: { params } }))
                return new Promise((resolve, reject) => {
                  const approve = (e) => { window.removeEventListener('smart-wallet:txApproved', approve); window.removeEventListener('smart-wallet:txRejected', rejectH); resolve(e.detail.txHash) }
                  const rejectH = (e) => { window.removeEventListener('smart-wallet:txApproved', approve); window.removeEventListener('smart-wallet:txRejected', rejectH); reject(new Error(e.detail?.message || 'User rejected the request.')) }
                  window.addEventListener('smart-wallet:txApproved', approve)
                  window.addEventListener('smart-wallet:txRejected', rejectH)
                  setTimeout(() => { window.removeEventListener('smart-wallet:txApproved', approve); window.removeEventListener('smart-wallet:txRejected', rejectH); reject(new Error('Transaction approval timeout')) }, 300000)
                })
              }
              return { error: 'Method not implemented: ' + method }
            },
            async enable() { return this.request({ method: 'eth_requestAccounts', params: [] }) },
            setSelectedAddress(address) {
              this.selectedAddress = address
              this.isConnected = true
              this.emit('accountsChanged', [address])
              this.emit('connect', { chainId: this.chainId })
              if (window.smartWalletProResolveRequest) { window.smartWalletProResolveRequest([address]) }
            },
            _listeners: {},
            on(event, listener) { if (!this._listeners[event]) this._listeners[event] = []; this._listeners[event].push(listener) },
            off(event, listener) { if (!this._listeners[event]) return; this._listeners[event] = this._listeners[event].filter(l => l !== listener) },
            emit(event, ...args) { if (!this._listeners[event]) return; this._listeners[event].forEach(l => { try { l(...args) } catch(e) { console.error(e) } }) }
          }
          Object.defineProperty(window, 'ethereum', { value: provider, configurable: true })
          console.log('✅ Smart Wallet Pro injected provider active (inject.ts)')
        })();
      ` + "`" + `
      const head = document.head || document.documentElement
      head.appendChild(providerScript)
    } catch (e) {
      console.error('Smart Wallet Pro: inject failed', e)
    }
  })();
`

try {
    const s = document.createElement("script")
    s.textContent = code
        ; (document.head || document.documentElement).appendChild(s)
} catch (e) {
    // fallback no-op
}


