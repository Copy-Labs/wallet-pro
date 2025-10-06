import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~components/ui/dialog"
import { Button } from "~components/ui/button"
// Badge from Radix UI themes is not available, we'll use a simple span instead
import { Send, AlertTriangle, Info, CheckCircle } from "lucide-react"
import type { SponsorshipCheck, GasEstimate } from "~types/account"

interface TransactionRequest {
  from?: string
  to?: string
  value?: string
  data?: string
  gas?: string
  gasPrice?: string
}

interface TransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  origin: string
  transaction: TransactionRequest
  accountName: string
  accountAddress: string
  gasEstimate?: GasEstimate
  sponsorship?: SponsorshipCheck
  onApprove: () => void
  onReject: () => void
  isProcessing?: boolean
}

export function TransactionDialog({
  isOpen,
  onClose,
  origin,
  transaction,
  accountName,
  accountAddress,
  gasEstimate,
  sponsorship,
  onApprove,
  onReject,
  isProcessing = false
}: TransactionDialogProps) {
  const handleApprove = () => {
    onApprove()
    onClose()
  }

  const handleReject = () => {
    onReject()
    onClose()
  }

  // Extract hostname from origin URL
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const hostname = getHostname(origin)

  // Format addresses for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Convert wei to ETH for display
  const formatEther = (wei: string) => {
    const eth = parseFloat(wei) / 1e18
    return eth.toFixed(6)
  }

  const isSponsorable = sponsorship?.canSponsor
  const valueEther = transaction.value ? formatEther(transaction.value) : "0"

  return (
    <Dialog open={isOpen} onOpenChange={() => !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <Send className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <DialogTitle>Approve Transaction</DialogTitle>
              <DialogDescription>
                {hostname} wants to send a transaction
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Account Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">From Account</span>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                Smart Account
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {accountName.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{accountName}</p>
                <p className="text-sm text-gray-500 font-mono">
                  {formatAddress(accountAddress)}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="border rounded-lg divide-y">
            {transaction.to && (
              <div className="p-4 flex justify-between">
                <span className="text-sm font-medium">To</span>
                <span className="text-sm font-mono">{formatAddress(transaction.to)}</span>
              </div>
            )}

            <div className="p-4 flex justify-between">
              <span className="text-sm font-medium">Value</span>
              <span className="text-sm">{valueEther} ETH</span>
            </div>

            {gasEstimate && (
              <>
                <div className="p-4 flex justify-between">
                  <span className="text-sm font-medium">Gas Estimate</span>
                  <span className="text-sm">{gasEstimate.estimatedCost} ETH</span>
                </div>
                <div className="p-4 flex justify-between">
                  <span className="text-sm font-medium">Estimated Cost (USD)</span>
                  <span className="text-sm">${gasEstimate.estimatedCostUSD}</span>
                </div>
              </>
            )}

            {transaction.data && transaction.data !== "0x" && (
              <div className="p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Data</span>
                </div>
                <div className="text-xs font-mono bg-gray-50 p-2 rounded break-all max-h-20 overflow-y-auto">
                  {transaction.data.length > 100
                    ? `${transaction.data.slice(0, 100)}...`
                    : transaction.data
                  }
                </div>
              </div>
            )}
          </div>

          {/* Sponsorship Info */}
          {sponsorship && (
            <div className={`p-4 rounded-lg border ${
              isSponsorable
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {isSponsorable ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm font-medium">
                  {isSponsorable ? "Gas sponsorship available" : "Gas sponsorship unavailable"}
                </span>
              </div>
              {isSponsorable ? (
                <p className="text-sm text-green-700">
                  This transaction qualifies for gas sponsorship. You pay $0 in gas fees.
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  {sponsorship.reason}
                </p>
              )}
            </div>
          )}

          {/* Network Info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700">
                Transaction will be sent on the currently selected network
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1"
          >
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? "Approving..." : "Approve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
