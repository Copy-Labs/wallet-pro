import React from "react"
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, Clock, ExternalLink, Copy, Search, Zap } from "lucide-react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { Badge } from "@radix-ui/themes"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import { getActiveAccount } from "~services/wallet"
import { getTransactionHistory } from "~services/transaction"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import { useNavigate } from "react-router-dom"

export function TransactionsPage() {
  const navigate = useNavigate()
  const [activeAccount, setActiveAccount] = React.useState<any>(null)
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [filteredTransactions, setFilteredTransactions] = React.useState<any[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filter, setFilter] = React.useState<'all' | 'sent' | 'received'>('all')
  const [currentChainId, setCurrentChainId] = React.useState<number>(11155111)
  const [copiedTxHash, setCopiedTxHash] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadData()
  }, [])

  React.useEffect(() => {
    filterTransactions()
  }, [transactions, searchQuery, filter])

  const loadData = async () => {
    try {
      const account = await getActiveAccount()
      setActiveAccount(account)

      if (account) {
        const history = await getTransactionHistory(account.id)
        setTransactions(history.transactions || [])
      }

      const chainId = await getSelectedNetwork()
      setCurrentChainId(chainId || 11155111)
    } catch (error) {
      console.error("Error loading transaction data:", error)
    }
  }

  const filterTransactions = () => {
    let filtered = [...transactions]

    // Apply type filter
    if (filter === 'sent') {
      filtered = filtered.filter(tx => tx.type === 'send')
    } else if (filter === 'received') {
      filtered = filtered.filter(tx => tx.type === 'receive')
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(query) ||
        tx.from.toLowerCase().includes(query) ||
        tx.to.toLowerCase().includes(query) ||
        tx.value.toLowerCase().includes(query)
      )
    }

    setFilteredTransactions(filtered)
  }

  const handleCopyTxHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash)
    setCopiedTxHash(hash)
    setTimeout(() => setCopiedTxHash(null), 2000)
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

  const getExplorerUrl = (txHash: string) => {
    const chain = getChainById(currentChainId) || defaultChain
    return `${chain.blockExplorers?.default.url}/tx/${txHash}`
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

  const isGasSponsored = (tx: any) => {
    if (!tx.gasUsed) return false
    const gasUsed = parseFloat(tx.gasUsed)
    return gasUsed === 0 || tx.type === 'send' // Assuming sponsorship for sends
  }

  const groupTransactionsByDate = (txs: any[]) => {
    const groups: { [key: string]: any[] } = {}

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
    <div className="min-h-[600px] w-[375px] flex flex-col bg-white">
      <WalletHeader title="Transaction History" />

      <div className="flex-1 overflow-auto pb-16">
        <div className="p-4">
          {/* Back button */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/accounts")}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">Transaction History</h2>
          </div>

          {/* Search and Filter */}
          {transactions.length > 0 && (
            <div className="space-y-4 mb-6">
              {/* Search Input */}
              <div className="relative">
                <Input
                  placeholder="Search by hash, address, or amount..."
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
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="flex-1 text-xs"
                >
                  All ({transactions.length})
                </Button>
                <Button
                  variant={filter === 'sent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('sent')}
                  className="flex-1 text-xs"
                >
                  Sent ({transactions.filter(tx => tx.type === 'send').length})
                </Button>
                <Button
                  variant={filter === 'received' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('received')}
                  className="flex-1 text-xs"
                >
                  Received ({transactions.filter(tx => tx.type === 'receive').length})
                </Button>
              </div>
            </div>
          )}

          {/* Transaction List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {transactions.length === 0 ? (
                <>
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No transactions yet</p>
                  <p className="text-sm mt-2">Your transaction history will appear here</p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No transactions found</p>
                  <p className="text-sm mt-2">Try adjusting your search or filter</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupTransactionsByDate(filteredTransactions))
                .sort(([a], [b]) => {
                  // Sort by date, with "Today" and "Yesterday" first
                  const order = ["Today", "Yesterday"]
                  if (order.includes(a) && order.includes(b)) {
                    return order.indexOf(a) - order.indexOf(b)
                  }
                  if (order.includes(a)) return -1
                  if (order.includes(b)) return 1
                  return b.localeCompare(a)
                })
                .map(([date, txs]) => (
                  <div key={date} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 px-1">{date}</h4>
                    <div className="space-y-2">
                      {txs.map((tx: any) => (
                        <div key={tx.hash} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
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
                                  <span className="font-semibold capitalize">{tx.type}</span>
                                  <span className="font-mono font-semibold">{formatBalance(tx.value)} ETH</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span>{formatTimestamp(tx.timestamp)}</span>
                                  {tx.status === 'success' && (
                                    <Badge color="green" variant="soft" size="1">
                                      <CheckCircle size={12} />
                                      Success
                                    </Badge>
                                  )}
                                  {tx.status === 'failed' && (
                                    <Badge color="red" variant="soft" size="1">
                                      <XCircle size={12} />
                                      Failed
                                    </Badge>
                                  )}
                                  {tx.status === 'pending' && (
                                    <Badge color="amber" variant="soft" size="1">
                                      <Clock size={12} />
                                      Pending
                                    </Badge>
                                  )}
                                  {isGasSponsored(tx) && tx.status === 'success' && (
                                    <Badge color="green" variant="soft" size="1">
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
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div>Block: {tx.blockNumber?.toLocaleString()}</div>
                              {tx.gasUsed && (
                                <div>Gas Used: {parseFloat(tx.gasUsed).toLocaleString()}</div>
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
                                onClick={() => window.open(getExplorerUrl(tx.hash), '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-2" />
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
      </div>

      <BottomNavigation />
    </div>
  )
}
