/**
 * Approval Tab Page
 * Handles connection requests, transaction approvals, and signature requests
 */

import React, { useState, useEffect } from "react"
import { Theme, Button, Flex, Text, Box, Card, Heading } from "@radix-ui/themes"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { getActiveAccount } from "~services/wallet"
import type { WalletAccount } from "~types/account"
import "@radix-ui/themes/styles.css"

interface ApprovalRequest {
  id: string
  type: 'connect' | 'transaction' | 'sign' | 'signTypedData' | 'addNetwork'
  origin: string
  url?: string
  data?: any
  timestamp: number
  chainConfig?: {
    chainId: number
    chainName: string
    nativeCurrency: {
      name: string
      symbol: string
      decimals: number
    }
    rpcUrls: string[]
    blockExplorerUrls?: string[]
  }
}

function ApprovalPage() {
  const [request, setRequest] = useState<ApprovalRequest | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get approval request from URL params
    const params = new URLSearchParams(window.location.search)
    const requestData = params.get('request')
    
    console.log('[Approval] URL params:', window.location.search)
    console.log('[Approval] Request data:', requestData)
    
    if (requestData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(requestData))
        console.log('[Approval] Parsed request:', parsed)
        setRequest(parsed)
      } catch (error) {
        console.error('[Approval] Failed to parse request:', error)
      }
    }

    // Load active account
    getActiveAccount().then(acc => {
      console.log('[Approval] Active account:', acc)
      setAccount(acc)
    })
  }, [])

  const handleApprove = async () => {
    if (!request) return
    
    setLoading(true)
    try {
      let result = true
      
      // For signing requests, we need to perform the actual signing
      if (request.type === 'sign' && request.data) {
        // The background will handle the actual signing
        // We just need to confirm approval
        result = account?.address || true
      }
      
      // Send approval response back to background
      const response = {
        id: request.id,
        approved: true,
        result,
        account: account?.address
      }
      
      console.log('[Approval] Sending approval response:', response)
      
      // Use chrome.runtime to send message
      chrome.runtime.sendMessage({
        type: 'approval_response',
        data: response
      })
      
      // Close window after a short delay
      setTimeout(() => {
        window.close()
      }, 100)
    } catch (error) {
      console.error('[Approval] Approval error:', error)
      setLoading(false)
    }
  }

  const handleReject = () => {
    if (!request) return
    
    console.log('[Approval] Rejecting request:', request.id)
    
    // Send rejection response
    chrome.runtime.sendMessage({
      type: 'approval_response',
      data: {
        id: request.id,
        approved: false
      }
    })
    
    // Close window
    setTimeout(() => {
      window.close()
    }, 100)
  }

  if (!request) {
    return (
      <Theme>
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '400px', padding: '20px' }}>
          <AlertCircle size={48} />
          <Text mt="4">No approval request found</Text>
          <Text size="2" color="gray" mt="2">
            This window can be closed.
          </Text>
        </Flex>
      </Theme>
    )
  }

  return (
    <Theme>
      <Box style={{ width: '100%', minHeight: '500px', padding: '20px' }}>
        <Flex direction="column" gap="4">
          {/* Header */}
          <Heading size="6">Approval Request</Heading>
          
          {/* Origin Info */}
          <Card>
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">From:</Text>
              <Text size="2" color="gray">{request.origin}</Text>
              {request.url && (
                <Text size="1" color="gray" style={{ wordBreak: 'break-all' }}>
                  {request.url}
                </Text>
              )}
            </Flex>
          </Card>

          {/* Account Info */}
          {account && (
            <Card>
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">Account:</Text>
                <Text size="2" color="gray">{account.name}</Text>
                <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </Text>
              </Flex>
            </Card>
          )}

          {/* Request Type Specific Content */}
          {request.type === 'connect' && (
            <Card>
              <Flex direction="column" gap="3">
                <Text size="3" weight="bold">Connect Wallet</Text>
                <Text size="2" color="gray">
                  This site is requesting access to view your account address.
                </Text>
                <Box>
                  <Text size="2" weight="bold">This will allow the site to:</Text>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li><Text size="2">View your account balance and activity</Text></li>
                    <li><Text size="2">Request approval for transactions</Text></li>
                  </ul>
                </Box>
              </Flex>
            </Card>
          )}

          {request.type === 'transaction' && (
            <Card>
              <Flex direction="column" gap="3">
                <Text size="3" weight="bold">Transaction Request</Text>
                {request.data && (
                  <Box>
                    <Text size="2" weight="bold">To:</Text>
                    <Text size="2" color="gray" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {request.data.to || 'Contract Creation'}
                    </Text>
                    {request.data.value && (
                      <>
                        <Text size="2" weight="bold" mt="2">Value:</Text>
                        <Text size="2" color="gray">
                          {request.data.value} ETH
                        </Text>
                      </>
                    )}
                    {request.data.data && request.data.data !== '0x' && (
                      <>
                        <Text size="2" weight="bold" mt="2">Data:</Text>
                        <Text size="1" color="gray" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {request.data.data.slice(0, 50)}...
                        </Text>
                      </>
                    )}
                  </Box>
                )}
              </Flex>
            </Card>
          )}

          {request.type === 'sign' && (
            <Card>
              <Flex direction="column" gap="3">
                <Text size="3" weight="bold">Signature Request</Text>
                <Text size="2" color="gray">
                  This site is requesting your signature.
                </Text>
                {request.data && (
                  <Box style={{ 
                    background: '#f5f5f5', 
                    padding: '12px', 
                    borderRadius: '8px',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}>
                    <Text size="1" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {typeof request.data === 'string' ? request.data : JSON.stringify(request.data, null, 2)}
                    </Text>
                  </Box>
                )}
              </Flex>
            </Card>
          )}

          {request.type === 'signTypedData' && (
            <Card>
              <Flex direction="column" gap="3">
                <Text size="3" weight="bold">Sign Typed Data</Text>
                <Text size="2" color="gray">
                  This site is requesting you to sign structured data.
                </Text>
                {request.data && (
                  <Box style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    <Text size="1" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {JSON.stringify(request.data, null, 2)}
                    </Text>
                  </Box>
                )}
              </Flex>
            </Card>
          )}

          {request.type === 'addNetwork' && request.chainConfig && (
            <Card>
              <Flex direction="column" gap="3">
                <Text size="3" weight="bold">Add Network Request</Text>
                <Text size="2" color="gray">
                  This site is requesting to add a new network to your wallet.
                </Text>

                <Box style={{ background: '#f0f8ff', padding: '16px', borderRadius: '8px', border: '1px solid #e1f5fe' }}>
                  <Flex direction="column" gap="2">
                    <Flex justify="between">
                      <Text size="2" weight="bold">Network:</Text>
                      <Text size="2" style={{ fontFamily: 'monospace' }}>
                        {request.chainConfig.chainName}
                      </Text>
                    </Flex>

                    <Flex justify="between">
                      <Text size="2" weight="bold">Chain ID:</Text>
                      <Text size="2" style={{ fontFamily: 'monospace' }}>
                        {request.chainConfig.chainId} (0x{request.chainConfig.chainId.toString(16)})
                      </Text>
                    </Flex>

                    <Flex justify="between">
                      <Text size="2" weight="bold">Currency:</Text>
                      <Text size="2" style={{ fontFamily: 'monospace' }}>
                        {request.chainConfig.nativeCurrency.symbol} ({request.chainConfig.nativeCurrency.decimals} decimals)
                      </Text>
                    </Flex>

                    <Flex justify="between">
                      <Text size="2" weight="bold">RPC URL:</Text>
                      <Text size="1" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {request.chainConfig.rpcUrls[0]}
                      </Text>
                    </Flex>

                    {request.chainConfig.blockExplorerUrls && request.chainConfig.blockExplorerUrls.length > 0 && (
                      <Flex justify="between">
                        <Text size="2" weight="bold">Block Explorer:</Text>
                        <Text size="1" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {request.chainConfig.blockExplorerUrls[0]}
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </Box>

                <Box>
                  <Text size="2" weight="bold">This will allow the site to:</Text>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li><Text size="2">Add this network to your wallet</Text></li>
                    <li><Text size="2">Switch to this network automatically</Text></li>
                    <li><Text size="2">Use this network for future transactions</Text></li>
                  </ul>
                </Box>
              </Flex>
            </Card>
          )}

          {/* Warning */}
          <Card style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
            <Flex gap="2" align="start">
              <AlertCircle size={20} color="#856404" />
              <Box>
                <Text size="2" weight="bold" style={{ color: '#856404' }}>
                  Only approve if you trust this site
                </Text>
                <Text size="1" style={{ color: '#856404' }}>
                  Make sure you understand what you're approving
                </Text>
              </Box>
            </Flex>
          </Card>

          {/* Action Buttons */}
          <Flex gap="3" mt="4">
            <Button
              size="3"
              variant="soft"
              color="gray"
              style={{ flex: 1 }}
              onClick={handleReject}
              disabled={loading}
            >
              <XCircle size={16} />
              Reject
            </Button>
            <Button
              size="3"
              style={{ flex: 1 }}
              onClick={handleApprove}
              disabled={loading}
            >
              <CheckCircle size={16} />
              {loading ? 'Approving...' : 'Approve'}
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Theme>
  )
}

export default ApprovalPage
