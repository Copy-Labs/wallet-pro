import React, { useState, useEffect } from "react"
import { Send, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Zap, Info, ExternalLink, Copy, Search } from "lucide-react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~components/ui/tabs"
import { Badge, Callout, Tooltip } from "@radix-ui/themes"
import QRCode from "qrcode"
import type { Transaction, GasEstimate, SponsorshipCheck } from "~/types/account"
import { getActiveAccount } from "~/services/wallet"
import {
  estimateSendGas,
  sendEth,
  checkGasSponsorship,
  getTransactionHistory
} from "~/services/transaction"
import { getGasSponsorshipStatus } from "~/utils/test-gas-sponsorship"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"

export function TransactionsTab() {
  const [activeAccount, setActiveAccount] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null)
  const [gasSponsorshipStatus, setGasSponsorshipStatus] = useState(getGasSponsorshipStatus())
  const [currentChainId, setCurrentChainId] = useState<number>(11155111) // Default to Sepolia

  // Transaction enhancement states
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

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
    loadCurrentChain()
  }, [])

  // Load transaction history when account changes
  useEffect(() => {
    if (activeAccount) {
      loadTransactionHistory()
      generateQRCode()
    }
  }, [activeAccount])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadActiveAccount = async () => {
    try {
      const account = await getActiveAccount()
      setActiveAccount(account)
    } catch (error) {
      console.error("Error loading active account:", error)
    }
  }

  const loadCurrentChain = async () => {
    try {
      const chainId = await getSelectedNetwork()
      setCurrentChainId(chainId || 11155111)
    } catch (error) {
      console.error("Error loading chain:", error)
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

  const getExplorerUrl = (txHash: string, chainId: number) => {
    const chain = getChainById(chainId) || defaultChain
    return `${chain.blockExplorers?.default.url}/tx/${txHash}`
  }

  const handleCopyTxHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash)
    setCopiedTxHash(hash)
    setTimeout(() => setCopiedTxHash(null), 2000)
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Check if transaction was gas sponsored (gasUsed is 0 or very low)
  const isGasSponsored = (tx: Transaction) => {
    if (!tx.gasUsed || !tx.gasPrice) return false
    const gasUsed = parseFloat(tx.gasUsed)
    return gasUsed === 0 || (tx.type === 'send' && gasSponsorshipStatus.enabled)
  }

  // Filter and search transactions
  const getFilteredTransactions = () => {
    let filtered = transactions

    // Apply type filter
    if (transactionFilter === 'sent') {
      filtered = filtered.filter(tx => tx.type === 'send')
    } else if (transactionFilter === 'received') {
      filtered = filtered.filter(tx => tx.type === 'receive')
    }

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(query) ||
        tx.from.toLowerCase().includes(query) ||
        tx.to.toLowerCase().includes(query) ||
        tx.value.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  // Group transactions by date
  const groupTransactionsByDate = (txs: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {}

    txs.forEach(tx => {
      const date = new Date(tx.timestamp * 1000)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let dateKey: string
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today'
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday'
      } else {
        dateKey = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        })
      }

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(tx)
    })

    return groups
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send ETH</h3>
              {gasSponsorshipStatus.enabled && (
                <Tooltip content="Gas fees are sponsored by Alchemy Gas Manager">
                  <Badge color="green" variant="soft" size="2">
                    <Zap size={12} />
                    Gasless
                  </Badge>
                </Tooltip>
              )}
            </div>

            <div className="space-y-4">
              {gasSponsorshipStatus.enabled && (
                <Callout.Root color="blue" size="1">
                  <Callout.Icon>
                    <Info />
                  </Callout.Icon>
                  <Callout.Text>
                    Gas fees are sponsored! You don't need ETH for transaction fees.
                  </Callout.Text>
                </Callout.Root>
              )}
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
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Gas Cost (est.):</span>
                      <span className="font-medium">{gasEstimate.estimatedCost} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Gas Cost (USD):</span>
                      <span className="font-medium">${gasEstimate.estimatedCostUSD}</span>
                    </div>
                  </div>

                  {sponsorshipCheck.canSponsor ? (
                    <Callout.Root color="green" size="1">
                      <Callout.Icon>
                        <Zap />
                      </Callout.Icon>
                      <Callout.Text>
                        <strong>Gas Sponsored!</strong> You won't pay any gas fees for this transaction.
                      </Callout.Text>
                    </Callout.Root>
                  ) : (
                    <Callout.Root color="amber" size="1">
                      <Callout.Icon>
                        <Info />
                      </Callout.Icon>
                      <Callout.Text>
                        <strong>Gas Not Sponsored:</strong> {sponsorshipCheck.reason}
                      </Callout.Text>
                    </Callout.Root>
                  )}
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
                            <span className="font-semibold">{amount} ETH</span>
                          </div>
                          <div>
                            <span className="font-medium">Gas Fee:</span>
                            <br />
                            {sponsorshipCheck.canSponsor ? (
                              <div className="flex items-center gap-1">
                                <Badge color="green" variant="soft" size="1">
                                  <Zap size={10} />
                                  FREE
                                </Badge>
                              </div>
                            ) : (
                              <span className="font-semibold">
                                {gasEstimate.estimatedCost} ETH
                              </span>
                            )}
                          </div>
                        </div>

                        {sponsorshipCheck.canSponsor && (
                          <Callout.Root color="green" size="1">
                            <Callout.Icon>
                              <Zap />
                            </Callout.Icon>
                            <Callout.Text>
                              This transaction is gasless! Gas fees (~${gasEstimate.estimatedCostUSD}) are sponsored.
                            </Callout.Text>
                          </Callout.Root>
                        )}

                        {sendError && (
                          <Callout.Root color="red" size="1">
                            <Callout.Text>{sendError}</Callout.Text>
                          </Callout.Root>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Transaction History</h3>
              {transactions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {getFilteredTransactions().length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Search and Filter Controls */}
            {transactions.length > 0 && (
              <div className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Input
                    placeholder="Search transactions by hash, address, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant={transactionFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionFilter('all')}
                    className="flex-1"
                  >
                    All ({transactions.length})
                  </Button>
                  <Button
                    variant={transactionFilter === 'sent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionFilter('sent')}
                    className="flex-1"
                  >
                    Sent ({transactions.filter(tx => tx.type === 'send').length})
                  </Button>
                  <Button
                    variant={transactionFilter === 'received' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionFilter('received')}
                    className="flex-1"
                  >
                    Received ({transactions.filter(tx => tx.type === 'receive').length})
                  </Button>
                </div>
              </div>
            )}

            {transactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm mt-2">Your transaction history will appear here</p>
              </div>
            ) : getFilteredTransactions().length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No transactions found</p>
                <p className="text-sm mt-2">
                  {searchQuery || transactionFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Your transaction history will appear here'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupTransactionsByDate(getFilteredTransactions())).map(([date, txs]) => (
                  <div key={date} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground px-1">
                      {date}
                    </h4>
                    <div className="space-y-2">
                      {txs.map((tx) => (
                        <div key={tx.hash} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                tx.type === 'send'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-green-100 text-green-600'
                              }`}>
                                {tx.type === 'send' ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">
                                    {tx.type === 'send' ? 'Sent' : 'Received'}
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {formatBalance(tx.value)} ETH
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{formatTimestamp(tx.timestamp)}</span>
                                  {tx.status === 'success' && (
                                    <Badge color="green" variant="solid" size="2">
                                      <CheckCircle size={12} />
                                      Success
                                    </Badge>
                                  )}
                                  {tx.status === 'failed' && (
                                    <Badge color="red" variant="solid" size="2">
                                      <XCircle size={12} />
                                      Failed
                                    </Badge>
                                  )}
                                  {tx.status === 'pending' && (
                                    <Badge color="amber" variant="solid" size="2">
                                      <Clock size={12} />
                                      Pending
                                    </Badge>
                                  )}
                                  {isGasSponsored(tx) && tx.status === 'success' && (
                                    <Badge color="green" variant="solid" size="2">
                                      <Zap size={12} />
                                      Gas Sponsored
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Transaction Details */}
                          <div className="ml-11 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {tx.type === 'send' ? 'To:' : 'From:'}
                              </span>
                              <span className="font-mono">
                                {formatAddress(tx.type === 'send' ? tx.to : tx.from)}
                              </span>
                            </div>

                            {/* Additional Details Row */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Block:</span>
                                <span>{tx.blockNumber.toLocaleString()}</span>
                              </div>
                              {tx.gasUsed && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Gas:</span>
                                  <span>{parseFloat(tx.gasUsed).toLocaleString()}</span>
                                </div>
                              )}
                              {tx.gasPrice && (
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Gas Price:</span>
                                  <span>{parseFloat(tx.gasPrice).toLocaleString()} wei</span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleCopyTxHash(tx.hash)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                {copiedTxHash === tx.hash ? 'Copied!' : 'Copy Hash'}
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                                onClick={() => window.open(getExplorerUrl(tx.hash, tx.chainId), '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View on Explorer
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
