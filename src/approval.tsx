/**
 * Approval Popup
 * Handles connection requests, transaction approvals, and signature requests
 */

import React, { useState, useEffect } from "react"
import { Button, Flex, Text, Box, Card, Heading } from "@radix-ui/themes"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { getActiveAccount } from "~services/wallet"
import type { WalletAccount } from "~types/account"

interface ApprovalRequest {
  id: string
  type: 'connect' | 'transaction' | 'sign' | 'signTypedData'
  origin: string
  url: string
  data?: any
  timestamp: number
}

function ApprovalPopup() {
  const [request, setRequest] = useState<ApprovalRequest | null>(null)
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get approval request from URL params
    const params = new URLSearchParams(window.location.search)
    const requestData = params.get('request')

    if (requestData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(requestData))
        setRequest(parsed)
      } catch (error) {
        console.error('Failed to parse request:', error)
      }
    }

    // Load active account
    getActiveAccount().then(setAccount)
  }, [])

  const handleApprove = async () => {
    if (!request) return

    setLoading(true)
    try {
      // Send approval response back to background
      const response = {
        id: request.id,
        approved: true,
        account: account?.address
      }

      // Use chrome.runtime to send message
      chrome.runtime.sendMessage({
        type: 'approval_response',
        data: response
      })

      // Close window
      window.close()
    } catch (error) {
      console.error('Approval error:', error)
      setLoading(false)
    }
  }

  const handleReject = () => {
    if (!request) return

    // Send rejection response
    chrome.runtime.sendMessage({
      type: 'approval_response',
      data: {
        id: request.id,
        approved: false
      }
    })

    // Close window
    window.close()
  }

  if (!request) {
    return (
      <Flex direction="column" align="center" justify="center" style={{ minHeight: '400px' }}>
        <AlertCircle size={48} />
        <Text mt="4">No approval request found</Text>
      </Flex>
    )
  }

  return (
    <Box style={{ width: '400px', minHeight: '500px', padding: '20px' }}>
      <Flex direction="column" gap="4">
        {/* Header */}
        <Heading size="6">Approval Request</Heading>

        {/* Origin Info */}
        <Card>
          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">From:</Text>
            <Text size="2" color="gray">{request.origin}</Text>
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
                  <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
                    {request.data.to}
                  </Text>
                  {request.data.value && (
                    <>
                      <Text size="2" weight="bold" mt="2">Value:</Text>
                      <Text size="2" color="gray">
                        {request.data.value} ETH
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

        {/* Warning */}
        <Card style={{ background: '#fff3cd', border: '1px solid #ffc107' }}>
          <Flex gap="2" align="start">
            <AlertCircle size={20} color="#856404" />
            <Flex direction={'column'}>
              <Text size="2" weight="bold" style={{ color: '#856404' }}>
                Only approve if you trust this site
              </Text>
              <Text size="1" style={{ color: '#856404' }}>
                Make sure you understand what you're approving
              </Text>
            </Flex>
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
  )
}

export default ApprovalPopup

