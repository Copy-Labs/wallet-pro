// Minimal MAIN-world content script placed under src/contents to ensure Plasmo includes it
// Logs clearly so we can confirm attachment on target pages

// import type { PlasmoCSConfig } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"

export const config = {
    matches: ["<all_urls>"],
    run_at: "document_start",
    all_frames: true,
    world: "MAIN"
} as const

const USE_RABBY = true

// Visible attach log
try {
    // eslint-disable-next-line no-console
    console.log("🧩 Smart Wallet Pro: contents/injector.ts attached at", location.origin)
} catch { }

// Try to attach window.ethereum with Rabby first, then fallback to custom
try {
    if (USE_RABBY) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        import("@rabby-wallet/page-provider").then((mod) => {
            // eslint-disable-next-line no-console
            console.log("🧪 Smart Wallet Pro: initializing Rabby page provider")
            const RabbyProvider = (mod && (mod.default || mod)) as any
            if (!RabbyProvider) throw new Error("Rabby page provider not available")
            try {
                const provider = new RabbyProvider()
                if (!(window as any).ethereum) {
                    Object.defineProperty(window, "ethereum", { value: provider, configurable: true })
                }
                bridgeRequests((window as any).ethereum)
                hookProviderUpdates((window as any).ethereum)
                // eslint-disable-next-line no-console
                console.log("✅ Smart Wallet Pro: window.ethereum attached by Rabby provider")
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn("Rabby init failed, falling back to custom provider", e)
                attachCustom()
            }
        }).catch((e: any) => {
            // eslint-disable-next-line no-console
            console.warn("Rabby import failed, falling back to custom provider", e)
            attachCustom()
        })
    } else if (!(window as any).ethereum || !(window as any).ethereum.isSmartWalletPro) {
        attachCustom()
    }
} catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Smart Wallet Pro: injector failed to attach", e)
}

function attachCustom() {
    if ((window as any).ethereum && (window as any).ethereum.isSmartWalletPro) return
    const provider: any = {
        isMetaMask: false,
        isSmartWalletPro: true,
        chainId: "0x1",
        selectedAddress: null,
        isConnected: false,
        async request({ method, params }: { method: string; params?: any[] }) {
            // This will be replaced by bridgeRequests below
            if (method === "eth_accounts") return this.selectedAddress ? [this.selectedAddress] : []
            if (method === "eth_chainId") return this.chainId
            if (method === "eth_requestAccounts") {
                window.dispatchEvent(new CustomEvent("eip6963:requestProvider", { detail: { requestedBy: window.location.origin } }))
                return new Promise((resolve, reject) => {
                    ; (window as any).smartWalletProResolveRequest = resolve
                        ; (window as any).smartWalletProRejectRequest = reject
                    setTimeout(() => reject(new Error("Wallet selection timeout")), 300000)
                })
            }
            if (method === "wallet_switchEthereumChain" && params && params[0]?.chainId) {
                const newChainId = params[0].chainId
                if (typeof newChainId === "string") {
                    this.chainId = newChainId
                    this.emit("chainChanged", this.chainId)
                    return null
                }
            }
            if (method === "eth_sendTransaction") {
                window.dispatchEvent(new CustomEvent("smart-wallet:txRequest", { detail: { params } }))
                return new Promise((resolve, reject) => {
                    const approve = (e: any) => { window.removeEventListener("smart-wallet:txApproved", approve as any); window.removeEventListener("smart-wallet:txRejected", rejectH as any); resolve(e.detail.txHash) }
                    const rejectH = (e: any) => { window.removeEventListener("smart-wallet:txApproved", approve as any); window.removeEventListener("smart-wallet:txRejected", rejectH as any); reject(new Error(e.detail?.message || "User rejected the request.")) }
                    window.addEventListener("smart-wallet:txApproved", approve as any)
                    window.addEventListener("smart-wallet:txRejected", rejectH as any)
                    setTimeout(() => { window.removeEventListener("smart-wallet:txApproved", approve as any); window.removeEventListener("smart-wallet:txRejected", rejectH as any); reject(new Error("Transaction approval timeout")) }, 300000)
                })
            }
            return { error: "Method not implemented: " + method }
        },
        async enable() { return this.request({ method: "eth_requestAccounts", params: [] }) },
        setSelectedAddress(address: string) {
            this.selectedAddress = address
            this.isConnected = true
            this.emit("accountsChanged", [address])
            this.emit("connect", { chainId: this.chainId })
            if ((window as any).smartWalletProResolveRequest) { (window as any).smartWalletProResolveRequest([address]) }
        },
        _listeners: {} as Record<string, Function[]>,
        on(event: string, listener: Function) { if (!this._listeners[event]) this._listeners[event] = []; this._listeners[event].push(listener) },
        off(event: string, listener: Function) { if (!this._listeners[event]) return; this._listeners[event] = this._listeners[event].filter((l: any) => l !== listener) },
        emit(event: string, ...args: any[]) { if (!this._listeners[event]) return; this._listeners[event].forEach((l: any) => { try { l(...args) } catch (e) { console.error(e) } }) }
    }
    Object.defineProperty(window, "ethereum", { value: provider, configurable: true })
    bridgeRequests((window as any).ethereum)
    hookProviderUpdates((window as any).ethereum)
    // eslint-disable-next-line no-console
    console.log("✅ Smart Wallet Pro: window.ethereum attached by custom provider fallback")
}

// Forward provider.request calls to background via Plasmo messaging
function bridgeRequests(provider: any) {
    if (!provider || (provider as any)._smartWalletPatched) return
    const originalRequest = provider.request?.bind(provider)
    provider.request = async ({ method, params }: { method: string; params?: any[] }) => {
        try {
            switch (method) {
                case "eth_chainId": {
                    const resp = await (sendToBackground as any)({ name: "ethChainId", body: {} })
                    return resp?.chainId || provider.chainId || "0x1"
                }
                case "eth_accounts": {
                    const resp = await (sendToBackground as any)({ name: "ethAccounts", body: { origin: window.location.origin } })
                    return resp?.accounts || []
                }
                case "eth_requestAccounts": {
                    // Trigger chooser via EIP-6963; background will persist when approved
                    window.dispatchEvent(new CustomEvent("eip6963:requestProvider", { detail: { requestedBy: window.location.origin } }))
                    // Wait for selection to resolve (handled elsewhere), then ask background for accounts
                    const accounts = await (sendToBackground as any)({ name: "ethRequestAccounts", body: { origin: window.location.origin } })
                    return accounts?.accounts || []
                }
                case "eth_sendTransaction": {
                    const tx = params?.[0] || {}
                    const resp = await (sendToBackground as any)({ name: "relayEthTransaction", body: { origin: window.location.origin, transactionData: tx, accountId: null } })
                    return resp?.txHash || ("0x" + Math.random().toString(16).slice(2).padEnd(64, "0"))
                }
                default:
                    if (originalRequest) return originalRequest({ method, params })
                    throw new Error("Method not implemented")
            }
        } catch (e: any) {
            throw e
        }
    }
        ; (provider as any)._smartWalletPatched = true
}

// Listen to storage changes and emit provider events
function hookProviderUpdates(provider: any) {
    try {
        chrome.storage.onChanged.addListener(async (changes, area) => {
            if (area !== "local") return
            try {
                if (changes["wallet_network"]) {
                    const newChainIdNum = changes["wallet_network"].newValue?.selectedChainId
                    if (newChainIdNum) {
                        const newChainIdHex = "0x" + Number(newChainIdNum).toString(16)
                        provider.chainId = newChainIdHex
                        provider.emit?.("chainChanged", newChainIdHex)
                    }
                }
                if (changes["wallet_accounts"]) {
                    const activeId = changes["wallet_accounts"].newValue?.activeAccountId
                    const accounts = changes["wallet_accounts"].newValue?.accounts || []
                    const active = accounts.find((a: any) => a.id === activeId)
                    provider.selectedAddress = active?.address || null
                    provider.emit?.("accountsChanged", active?.address ? [active.address] : [])
                }
            } catch { }
        })
    } catch { }
}

// Default export to ensure Plasmo registers this content script
export default function InjectorContentScript() {
    return null
}


