import { ALCHEMY_API_KEY, getAlchemyRpcUrl } from "~config/alchemy"
import type { Address } from "viem"

export interface SwapQuote {
  expiry: number
  minimumToAmount: string
  fromAmount: string
}

export interface SwapRequest {
  from: Address
  chainId: number
  fromToken: Address
  toToken: Address
  fromAmount?: string
  minimumToAmount?: string
  postCalls?: Array<{
    to: Address
    data: string
    value: string
  }>
  capabilities?: {
    paymasterService?: {
      policyId: string
    }
  }
}

export interface SwapResponse {
  rawCalls: boolean
  chainId: number
  quote: SwapQuote
  type: string
  data: string
  signatureRequest: {
    type: string
    data: {
      raw: string
    }
    rawPayload: string
  }
  feePayment: {
    sponsored: boolean
    tokenAddress: string
    maxAmount: string
  }
}

export interface SendPreparedCallsRequest {
  type: string
  data: string
  chainId: number
  signature: {
    type: string
    data: string
  }
}

export interface SendPreparedCallsResponse {
  preparedCallIds: string[]
}

export interface CallStatusResponse {
  id: string
  chainId: number
  atomic: boolean
  status: number
  receipts?: Array<{
    transactionHash: string
    blockNumber: string
    gasUsed: string
    status: number
  }>
}

export interface CrossChainSwapRequest {
  from: Address
  chainId: number
  toChainId: string
  fromToken: Address
  toToken: Address
  fromAmount?: string
  minimumToAmount?: string
  capabilities?: {
    paymasterService?: {
      policyId: string
    }
  }
}

export interface CrossChainSwapResponse {
  rawCalls: boolean
  chainId: number
  callId: string
  quote: SwapQuote
  type: string
  data: string
  signatureRequest: {
    type: string
    data: {
      raw: string
    }
    rawPayload: string
  }
  feePayment: {
    sponsored: boolean
    tokenAddress: string
    maxAmount: string
  }
}

export interface SendCrossChainPreparedCallsRequest {
  callId: string
  type: string
  data: string
  chainId: number
  signature: {
    type: string
    data: string
  }
}

/**
 * Request a swap quote from Alchemy
 */
export async function requestSwapQuote(params: SwapRequest): Promise<SwapResponse> {
  const url = `https://api.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "wallet_requestQuote_v0",
    params: [params]
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message}`)
  }

  return data.result
}

/**
 * Send prepared calls to execute the swap
 */
export async function sendPreparedCalls(params: SendPreparedCallsRequest): Promise<SendPreparedCallsResponse> {
  const url = `https://api.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const payload = {
    jsonrpc: "2.0",
    method: "wallet_sendPreparedCalls",
    params: [params],
    id: 1
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message}`)
  }

  return data.result
}

/**
 * Get the status of prepared calls
 */
export async function getCallsStatus(callIds: string[]): Promise<CallStatusResponse[]> {
  const url = `https://api.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const payload = {
    jsonrpc: "2.0",
    method: "wallet_getCallsStatus",
    params: [callIds],
    id: 1
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message}`)
  }

  return data.result
}

/**
 * Sign a message using the browser's ethereum provider
 */
export async function signMessage(message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error("No Ethereum provider found")
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
  const account = accounts[0]

  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, account]
  })

  return signature
}

/**
 * Request a cross-chain swap quote from Alchemy
 */
export async function requestCrossChainSwapQuote(params: CrossChainSwapRequest): Promise<CrossChainSwapResponse> {
  const url = `https://api.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "wallet_requestQuote_v0",
    params: [params]
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message}`)
  }

  return data.result
}

/**
 * Send prepared calls for cross-chain swap execution
 */
export async function sendCrossChainPreparedCalls(params: SendCrossChainPreparedCallsRequest): Promise<SendPreparedCallsResponse> {
  const url = `https://api.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

  const payload = {
    jsonrpc: "2.0",
    method: "wallet_sendPreparedCalls",
    params: [params],
    id: 1
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message}`)
  }

  return data.result
}

/**
 * Get the current network chain ID
 */
export async function getCurrentChainId(): Promise<number> {
  if (!window.ethereum) {
    throw new Error("No Ethereum provider found")
  }

  const chainIdHex = await window.ethereum.request({ method: "eth_chainId" })
  return parseInt(chainIdHex, 16)
}
