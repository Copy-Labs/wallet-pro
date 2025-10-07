import React, { useState, useEffect } from "react"
import { Send, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "~ComponentsUI/ui/button"
import { Input } from "~ComponentsUI/ui/input"
import { Label } from "~ComponentsUI/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~ComponentsUI/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~ComponentsUI/ui/tabs"
import QRCode from "qrcode"
import type { Transaction, GasEstimate, SponsorshipCheck } from "~/types/account"
import { getActiveAccount } from "~/services/wallet"
import {
  estimateSendGas,
  sendEth,
  checkGasSponsorship,
  getTransactionHistory
} from "~/services/transaction"

export function TransactionsTab() {
  const [activeAccount, setActiveAccount] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [copiedAddress, setCopiedAddress] = useState(false)

  // Send states
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  const [sponsorshipCheck, setSponsorshipCheck] = useState<SponsorshipCheck | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sendError, setSendError] = useState("")

  // Load active account and QR code
  useEffect(() => {
    loadActiveAccount()
  }, [])

  // Load transaction history when account changes
  useEffect(() => {
    if (activeAccount) {
      loadTransactionHistory()
      generateQRCode()
    }
  }, [activeAccount])

  const loadActiveAccount = async () => {
    try {
      const account = await getActiveAccount()
      setActiveAccount(account)
    } catch (error) {
      console.error("Error loading active account:", error)
    }
  }

  const loadTransactionHistory = async () => {
    try {
      const history = await getTransactionHistory(activeAccount.id)
      setTransactions(history.transactions)
    } catch (error) {
      console.error("Error loading transaction history:", error)
    }
  }

  const generateQRCode = async () => {
    if (activeAccount?.address) {
      try {
        const qrDataUrl = await QRCode.toDataURL(activeAccount.address, {
          width: 200,
          margin: 2,
        })
        setQrCodeUrl(qrDataUrl)
      } catch (error) {
        console.error("Error generating QR code:", error)
      }
    }
  }

  const handleCopyAddress = async () => {
    if (activeAccount?.address) {
      await navigator.clipboard.writeText(activeAccount.address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  const handleEstimateGas = async () => {
    if (!recipient || !amount || !activeAccount) return

    setIsLoading(true)
    try {
      const estimate = await estimateSendGas(activeAccount.id, recipient as `0x${string}`, amount)
      setGasEstimate(estimate)

      // Check sponsorship eligibility
      const sponsorship = await checkGasSponsorship(estimate.estimatedCostUSD)
      setSponsorshipCheck(sponsorship)
    } catch (error) {
      setSendError(`Failed to estimate gas: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendTransaction = async () => {
    if (!gasEstimate || !sponsorshipCheck || !activeAccount) return

    setIsLoading(true)
    setSendError("")

    try {
      const useSponsor = sponsorshipCheck.canSponsor

      const txHash = await sendEth(activeAccount.id, recipient as `0x${string}`, amount, useSponsor)

      // Success - reset form and reload data
      setSendDialogOpen(false)
      setRecipient("")
      setAmount("")
      setGasEstimate(null)
      setSponsorshipCheck(null)

      // Reload transaction history
      await loadTransactionHistory()

      alert(`Transaction sent successfully! Hash: ${txHash}`)
    } catch (error) {
      setSendError(`Failed to send transaction: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (value: string) => {
    const num = parseFloat(value)
    if (num === 0) return "0.0000"
    if (num < 0.0001) return "< 0.0001"
    return num.toFixed(4)
  }

  return (
    <Tabs defaultValue="send" className="flex flex-col h-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="send">Send</TabsTrigger>
        <TabsTrigger value="receive">Receive</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-auto">
        {/* Send Tab */}
        <TabsContent value="send" className="m-0 p-4">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-4">Send ETH</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount (ETH)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.0001"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {gasEstimate && sponsorshipCheck && (
                <div className="p-3 border rounded-lg bg-muted/30">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Gas Cost (est.):</span>
                      <span>{gasEstimate.estimatedCost} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gas Cost (USD):</span>
                      <span>${gasEstimate.estimatedCostUSD}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sponsorship:</span>
                      <span className={sponsorshipCheck.canSponsor ? "text-green-600" : "text-red-600"}>
                        {sponsorshipCheck.canSponsor ? "Available" : "Not Available"}
                      </span>
                    </div>
                    {!sponsorshipCheck.canSponsor && (
                      <div className="text-xs text-red-600">
                        {sponsorshipCheck.reason}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleEstimateGas}
                  disabled={!recipient || !amount}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? "Estimating..." : "Estimate Gas"}
                </Button>

                <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                  <Button
                    onClick={() => setSendDialogOpen(true)}
                    disabled={!gasEstimate}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Transaction</DialogTitle>
                      <DialogDescription>
                        Review the transaction details before sending
                      </DialogDescription>
                    </DialogHeader>

                    {gasEstimate && sponsorshipCheck && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">From:</span>
                            <br />
                            <span className="text-muted-foreground">
                              {formatAddress(activeAccount.address)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">To:</span>
                            <br />
                            <span className="text-muted-foreground">
                              {formatAddress(recipient)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span>
                            <br />
                            <span>{amount} ETH</span>
                          </div>
                          <div>
                            <span className="font-medium">Cost:</span>
                            <br />
                            <span className={sponsorshipCheck.canSponsor ? "text-green-600" : ""}>
                              {sponsorshipCheck.canSponsor
                                ? `${gasEstimate.estimatedCost} ETH (Sponsored)`
                                : `${gasEstimate.estimatedCost} ETH`}
                            </span>
                          </div>
                        </div>

                        {sendError && (
                          <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-800">
                            {sendError}
                          </div>
                        )}
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setSendDialogOpen(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSendTransaction} disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Transaction"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {sendError && !sendDialogOpen && (
                <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-800 text-sm">
                  {sendError}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Receive Tab */}
        <TabsContent value="receive" className="m-0 p-4">
          <div className="max-w-sm mx-auto text-center">
            <h3 className="text-lg font-semibold mb-4">Receive ETH</h3>

            {activeAccount ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="Address QR Code"
                      className="mx-auto mb-4"
                    />
                  )}
                  <p className="text-sm text-muted-foreground mb-2">
                    Your Address
                  </p>
                  <p className="font-mono text-sm break-all">
                    {activeAccount.address}
                  </p>
                </div>

                <Button
                  onClick={handleCopyAddress}
                  className="w-full"
                  variant="outline"
                >
                  {copiedAddress ? "Copied!" : "Copy Address"}
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No active account selected
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="m-0 p-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Transaction History</h3>

            {transactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                No transactions yet
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.hash} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tx.type === 'send' ? (
                        <ArrowUpRight className="w-4 h-4 text-red-500" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                      )}
                      <div>
                        <div className="font-medium">
                          {tx.type === 'send' ? 'Send' : 'Receive'} {formatBalance(tx.value)} ETH
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(tx.timestamp * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {tx.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {tx.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {tx.status === 'pending' && (
                        <Clock className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
