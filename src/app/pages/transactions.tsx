import React from "react"
import {
  ArrowUpRight, ArrowDownLeft, XCircle, Clock, ExternalLink, Copy, Search, Zap,
  LucideEllipsisVertical, Check, ArrowRight, LucideX
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  Code,
  DataList,
  Dialog,
  Flex,
  Heading,
  IconButton,
  SegmentedControl,
  Text,
  TextField, Tooltip
} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"
import { useUIStore } from "~/store/ui-store"
import { getActiveAccount } from "~services/wallet"
import { getTransactionHistory } from "~services/transaction"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import { useNavigate } from "react-router-dom"
import {PageBody, PageContainer, PageFooter, PageHeader, PageHeading} from "~components/PageContainer";
import CopyTextComponent from "~components/CopyToClipboard";
import {formatAddress, formatBalance, formatDate, formatTimestamp, shortenAddress} from "~utils";
import {DotSpacerSmall} from "~components/DotSpacer";
import {cn} from "~lib/utils";
import {formatEther} from "viem";

function TransactionDetailsDialog({ tx }: { tx: any }) {
  const getExplorerUrl = (txHash: string) => {
    const chain = getChainById(tx.currentChainId) || defaultChain
    return `${chain.blockExplorers?.default.url}/tx/${txHash}`
  }

  const calculateTransactionFee = () => {
    if (!tx.gasUsed || !tx.gasPrice) return null
    const gasUsed = parseFloat(tx.gasUsed)
    const gasPrice = parseFloat(tx.gasPrice)
    return (gasUsed * gasPrice).toString()
  }

  const isGasSponsored = () => {
    if (!tx.gasUsed) return false
    const gasUsed = parseFloat(tx.gasUsed)
    return gasUsed === 0 || tx.type === 'send'
  }

  const chain = getChainById(tx.currentChainId) || defaultChain

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <LucideEllipsisVertical size={14} strokeWidth={2} />
      </Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Transaction Details</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          <Flex align={'center'}>
            <Flex align={'center'} gap={'1'} flexGrow={'1'}>
              <Text color={'gray'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm87.62,96H175.79C174,83.49,159.94,57.67,148.41,42.4A88.19,88.19,0,0,1,215.63,120ZM96.23,136h63.54c-2.31,41.61-22.23,67.11-31.77,77C118.45,203.1,98.54,177.6,96.23,136Zm0-16C98.54,78.39,118.46,52.89,128,43c9.55,9.93,29.46,35.43,31.77,77Zm11.36-77.6C96.06,57.67,82,83.49,80.21,120H40.37A88.19,88.19,0,0,1,107.59,42.4ZM40.37,136H80.21c1.82,36.51,15.85,62.33,27.38,77.6A88.19,88.19,0,0,1,40.37,136Zm108,77.6c11.53-15.27,25.56-41.09,27.38-77.6h39.84A88.19,88.19,0,0,1,148.41,213.6Z"></path></svg>
              </Text>
              <Tooltip content={`${tx.type === "send" ? "Sent" : "Received"} on ${chain.name}`}>
                <Text color={'gray'} size={'1'}>{chain.name}</Text>
              </Tooltip>
            </Flex>
            <Flex flexGrow={'1'}>
              <DotSpacerSmall />
            </Flex>
            <Flex align={'center'} gap={'1'} flexGrow={'1'}>
              {/*<div className={`relative p-1 rounded-full ${
                tx.type === 'send'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-grassA5 text-grass10'
              }`}>
                {tx.type === 'send' ? (
                  <ArrowUpRight size={14} strokeWidth={3} />
                ) : (
                  <ArrowDownLeft size={14} strokeWidth={3} />
                )}
              </div>*/}
              <Flex align={'center'} justify={'center'} className={cn('size-5 rounded-full text-white', tx.type === 'receive' ? ' bg-grass10' : 'bg-ruby11')}>
                {tx.type === 'send' ? (
                  <ArrowUpRight size={14} strokeWidth={3} />
                ): (
                  <ArrowDownLeft size={14} strokeWidth={3} />
                )}
              </Flex>
              <Text color={'gray'} size="1">{tx.type === 'send' ? 'Send' : 'Receive'}</Text>
            </Flex>
            <Flex flexGrow={'1'}>
              <DotSpacerSmall />
            </Flex>
            <Flex align={'center'} gap={'1'}>
              <Text color={'gray'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"></path><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z"></path></svg>
              </Text>
              <Tooltip content={formatDate(tx.timestamp)}>
                <Text color={'gray'} size={'1'}>{formatTimestamp(tx.timestamp)}</Text>
              </Tooltip>
            </Flex>
          </Flex>
        </Dialog.Description>

        <Card mb="6">
          <Flex align={'center'} justify={'between'}>
            <Flex direction={'column'} align={'start'} justify={'center'}>
              <Flex align="center" gap="2">
                <Text size="1" color="gray">From</Text>
                <CopyTextComponent
                  textToCopy={tx.from}
                  icon={
                    <Tooltip content={"Copy from address"}>
                      <IconButton
                        size="1"
                        aria-label="Copy from address"
                        color="gray"
                        variant="ghost"
                      >
                        <Copy size={12}/>
                      </IconButton>
                    </Tooltip>
                  }
                  successIcon={
                    <IconButton
                      size="1"
                      aria-label="Copy from address"
                      color="gray"
                      variant="ghost"
                    >
                      <Check className={'text-grass11'} size={12} strokeWidth={4}/>
                    </IconButton>
                  }
                />
              </Flex>
              <Flex align={'start'} direction={'column'} gap={'0'}>
                <Text color={'gray'} size={'1'} className="font-medium">{tx.name}</Text>
                <Text size={'2'}>{shortenAddress(tx.from)}</Text>
              </Flex>
            </Flex>

            <div className="flex items-center justify-center bg-gray11 rounded-full p-1">
              <ArrowRight size={16} strokeWidth={4} />
            </div>

            <Flex direction={'column'} align={'end'} justify={'center'}>
              <Flex align="center" gap="2">
                <CopyTextComponent
                  textToCopy={tx.to}
                  icon={
                    <Tooltip content={"Copy to Address"}>
                      <IconButton
                          size="1"
                          aria-label="Copy to address"
                          color="gray"
                          variant="ghost"
                        >
                          <Copy size={12} />
                        </IconButton>
                    </Tooltip>
                  }
                  successIcon={<IconButton
                    size="1"
                    aria-label="Copy to address"
                    color="gray"
                    variant="ghost"
                  >
                    <Check className={'text-grass11'} size={12} strokeWidth={4} />
                  </IconButton>}
                />
                <Text size="1" color="gray">To</Text>
              </Flex>
              <Flex align={'end'} direction={'column'} gap={'0'}>
                <Text color={'gray'} size={'1'} className="font-medium">{tx.to.name}</Text>
                <Text size={'2'}>{shortenAddress(tx.to)}</Text>
              </Flex>
            </Flex>

          </Flex>
        </Card>

          <DataList.Root>
            {/* Status */}
            <DataList.Item align="center">
              <DataList.Label minWidth="88px">Status</DataList.Label>
              <DataList.Value>
                {tx.status === 'success' && (
                  <Badge color="grass" variant="soft" size="1">
                    <Check size={12} />
                    Success
                  </Badge>
                )}
                {tx.status === 'failed' && (
                  <Badge color="red" variant="soft" size="1">
                    <XCircle size={12}/>
                    Failed
                  </Badge>
                )}
                {tx.status === 'pending' && (
                  <Badge color="amber" variant="soft" size="1">
                    <Clock size={12}/>
                    Pending
                  </Badge>
                )}
              </DataList.Value>
            </DataList.Item>

            {/* Transaction Type */}
            {/*<DataList.Item>
              <DataList.Label minWidth="88px">Type</DataList.Label>
              <DataList.Value>
                <Badge color={tx.type === 'send' ? 'red' : 'grass'} variant="soft" size="1">
                  {tx.type === 'send' ? 'Send' : 'Receive'}
                </Badge>
              </DataList.Value>
            </DataList.Item>*/}

            {/* Transaction Hash */}
            <DataList.Item>
              <DataList.Label minWidth="88px">Hash</DataList.Label>
              <DataList.Value>
                <Flex align="center" gap="2">
                  {tx.hash && <Code variant="ghost">{formatAddress(tx.hash)}</Code>}
                  <CopyTextComponent
                    textToCopy={tx.hash}
                    icon={<IconButton
                      size="1"
                      aria-label="Copy hash"
                      color="gray"
                      variant="ghost"
                    >
                      <Copy size={16} />
                    </IconButton>}
                    successIcon={<IconButton
                      size="1"
                      aria-label="Copy hash"
                      color="gray"
                      variant="ghost"
                    >
                      <Check className={'text-grass11'} size={16} strokeWidth={4} />
                    </IconButton>}
                  />
                </Flex>
              </DataList.Value>
            </DataList.Item>

            {/* Block Number */}
            <DataList.Item>
              <DataList.Label minWidth="88px">Block</DataList.Label>
              <DataList.Value>
                <Text>{tx.blockNumber?.toLocaleString()}</Text>
              </DataList.Value>
            </DataList.Item>

            {/* Amount */}
            <DataList.Item>
              <DataList.Label minWidth="88px">Amount</DataList.Label>
              <DataList.Value>
                <Text size={'2'} className="">{tx.value ? parseFloat(formatEther(tx.value as any)) : '0.0000'} ETH</Text>
              </DataList.Value>
            </DataList.Item>

            {/* From Address */}
            {/*<DataList.Item>
              <DataList.Label minWidth="88px">From</DataList.Label>
              <DataList.Value>
                <Flex align="center" gap="2">
                  <Code variant="ghost">{formatAddress(tx.from)}</Code>
                  <CopyTextComponent
                    textToCopy={tx.from}
                    icon={<IconButton
                      size="1"
                      aria-label="Copy from address"
                      color="gray"
                      variant="ghost"
                    >
                      <Copy size={16} />
                    </IconButton>}
                    successIcon={<IconButton
                      size="1"
                      aria-label="Copy from address"
                      color="gray"
                      variant="ghost"
                    >
                      <Check className={'text-grass11'} size={16} strokeWidth={4} />
                    </IconButton>}
                  />
                </Flex>
              </DataList.Value>
            </DataList.Item>*/}

            {/* To Address */}
            {/*<DataList.Item>
              <DataList.Label minWidth="88px">To</DataList.Label>
              <DataList.Value>
                <Flex align="center" gap="2">
                  <Code variant="ghost">{formatAddress(tx.to)}</Code>
                  <CopyTextComponent
                    textToCopy={tx.to}
                    icon={<IconButton
                      size="1"
                      aria-label="Copy to address"
                      color="gray"
                      variant="ghost"
                    >
                      <Copy size={16} />
                    </IconButton>}
                    successIcon={<IconButton
                      size="1"
                      aria-label="Copy to address"
                      color="gray"
                      variant="ghost"
                    >
                      <Check className={'text-grass11'} size={16} strokeWidth={4} />
                    </IconButton>}
                  />
                </Flex>
              </DataList.Value>
            </DataList.Item>*/}

            {/* Date & Time */}
            {/*<DataList.Item>
              <DataList.Label minWidth="88px">Date</DataList.Label>
              <DataList.Value>
                <Text>{formatDate(tx.timestamp)}</Text>
              </DataList.Value>
            </DataList.Item>*/}

            {/* Network */}
            {/*<DataList.Item>
              <DataList.Label minWidth="88px">Network</DataList.Label>
              <DataList.Value>
                <Text>{chain.name}</Text>
              </DataList.Value>
            </DataList.Item>*/}

            {/* Gas Information */}
            {tx.gasUsed && (
              <DataList.Item>
                <DataList.Label minWidth="88px">Gas Used</DataList.Label>
                <DataList.Value>
                  <Text size={'2'}>{parseFloat(tx.gasUsed).toLocaleString()}</Text>
                </DataList.Value>
              </DataList.Item>
            )}

            {tx.gasPrice && (
              <DataList.Item>
                <DataList.Label minWidth="88px">Gas Price</DataList.Label>
                <DataList.Value>
                  <Text size={'2'}>{parseFloat(formatEther(tx.gasPrice)).toFixed(12)} ETH</Text>
                </DataList.Value>
              </DataList.Item>
            )}

            {/* Transaction Fee */}
            {calculateTransactionFee() && (
              <DataList.Item>
                <DataList.Label minWidth="88px">Fee</DataList.Label>
                <DataList.Value>
                  <Flex align="center" gap="2">
                    <Text size={'2'}>{parseFloat(formatEther(BigInt(calculateTransactionFee()!))).toFixed(6)} ETH</Text>
                    {isGasSponsored() && tx.status === 'success' && (
                      <Badge color="green" variant="soft" size="1">
                        <Zap size={12} />
                        Sponsored
                      </Badge>
                    )}
                  </Flex>
                </DataList.Value>
              </DataList.Item>
            )}
          </DataList.Root>

        {/* Action Buttons */}
        <Flex align={'center'} justify={'center'} className="gap-2 pt-8">
          <Button
            variant="soft"
            color="gray"
            size="1"
            onClick={() => window.open(getExplorerUrl(tx.hash), '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            View on Explorer
          </Button>
        </Flex>

        <Flex className={'absolute top-2 right-2'} gap="3" justify="end">
          <Dialog.Close>
            <IconButton variant="solid" color="red" radius={'full'} size={'1'}>
              <LucideX size={14} strokeWidth={3} />
            </IconButton>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}


export function TransactionsPage() {
  const navigate = useNavigate()
  const [activeAccount, setActiveAccount] = React.useState<any>(null)
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [filteredTransactions, setFilteredTransactions] = React.useState<any[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filter, setFilter] = React.useState<'all' | 'sent' | 'received'>('all')
  const [currentChainId, setCurrentChainId] = React.useState<number>(11155111)

  console.log("Filtered Transactions", filteredTransactions);

  React.useEffect(() => {
    loadData()

    // Subscribe to network changes to reload transactions
    const unsubscribeNetwork = useUIStore.subscribe(
      (state) => state.selectedNetwork.id,
      async (newChainId) => {
        console.log('🗘 Network changed, reloading transactions for chain:', newChainId)
        await loadData()
      }
    )

    return () => {
      unsubscribeNetwork()
    }
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (value: string) => {
    const num = parseFloat(value)
    if (num === 0) return "0.0000"
    if (num < 0.0001) return "< 0.0001"
    return num.toFixed(4)
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
    <PageContainer>
      <PageHeader showBackButton={false}>
        <PageHeading>Transactions History</PageHeading>
      </PageHeader>
      <PageBody>
        {/*  <WalletHeader title="Transaction History" />*/}
          <div className="px-4">
            {/* Search and Filter */}
            {transactions.length > 0 && (
              <div className="space-y-4 mb-6">
                {/* Search Input */}
                <div className="relative">
                  {/*<Input
                    placeholder="Search by hash, address, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-8"
                  />*/}

                  {/*<div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>*/}

                  <TextField.Root
                    placeholder="Search by hash, address, or amount..."
                    value={searchQuery}
                    variant={'soft'}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  >
                    <TextField.Slot>
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </TextField.Slot>
                  </TextField.Root>
                </div>

                {/* Filter Buttons */}
                <SegmentedControl.Root defaultValue="all" value={filter} onValueChange={(value) => setFilter(value as any)}>
                  <SegmentedControl.Item value="all">All ({transactions.length})</SegmentedControl.Item>
                  <SegmentedControl.Item value="sent">Sent ({transactions.filter(tx => tx.type === 'send').length})</SegmentedControl.Item>
                  <SegmentedControl.Item value="received">Received ({transactions.filter(tx => tx.type === 'receive').length})</SegmentedControl.Item>
                </SegmentedControl.Root>

                {/*<div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'solid' : 'soft'}
                    size="1"
                    onClick={() => setFilter('all')}
                    className="flex-1 text-xs"
                  >
                    All ({transactions.length})
                  </Button>
                  <Button
                    variant={filter === 'sent' ? 'solid' : 'soft'}
                    size="1"
                    onClick={() => setFilter('sent')}
                    className="flex-1 text-xs"
                  >
                    Sent ({transactions.filter(tx => tx.type === 'send').length})
                  </Button>
                  <Button
                    variant={filter === 'received' ? 'solid' : 'soft'}
                    size="1"
                    onClick={() => setFilter('received')}
                    className="flex-1 text-xs"
                  >
                    Received ({transactions.filter(tx => tx.type === 'receive').length})
                  </Button>
                </div>*/}
              </div>
            )}

            {/* Transaction List */}
            {filteredTransactions.length === 0 ? (
              <Flex direction={'column'} align={'center'} justify={'center'} className="py-8">
                {transactions.length === 0 ? (
                  <>
                    <Text color={'gray'}><Clock size={48} className="mx-auto mb-4 opacity-50" /></Text>
                    <Heading className={''} size={'2'}>No transactions yet</Heading>
                    <Text align={'center'} className="w-full">Your transaction history will appear here</Text>
                  </>
                ) : (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <Heading size={'2'}>No transactions found</Heading>
                    <Text align={'center'} className="mt-2">Try adjusting your search or filter</Text>
                  </>
                )}
              </Flex>
            ) : (
              <div className="space-y-4 pb-2">
                {Object.entries(groupTransactionsByDate(filteredTransactions))
                  .sort(([dateA, txsA], [dateB, txsB]) => {
                    // Keep "Today" and "Yesterday" prioritized first
                    const order = ["Today", "Yesterday"]
                    if (order.includes(dateA) && order.includes(dateB)) {
                      return order.indexOf(dateA) - order.indexOf(dateB)
                    }
                    if (order.includes(dateA)) return -1
                    if (order.includes(dateB)) return 1

                    // For other dates: sort by the most recent transaction in each group
                    // This ensures chronological ordering (newest first)
                    const latestTimestampA = Math.max(...txsA.map((tx: any) => tx.timestamp))
                    const latestTimestampB = Math.max(...txsB.map((tx: any) => tx.timestamp))
                    return latestTimestampB - latestTimestampA // Newest date first
                  })
                  .map(([date, txs]) => (
                    <div key={date} className="space-y-2">
                      <Text color={'gray'} className="px-1" size={'1'}>{date}</Text>
                      <div className="space-y-2">
                        {txs
                          .sort((a: any, b: any) => b.timestamp - a.timestamp) // Within each day, newest first
                          .map((tx: any) => (
                          <Card key={tx.hash} className="transition-colors">
                            <div className="relative flex items-start justify-between mb-2">
                              <Flex align={'start'} className="" gap={'3'} width={'100%'}>
                                <div className={`relative p-2 rounded-full ${
                                  tx.type === 'send'
                                    ? 'bg-redA6 text-red8'
                                    : 'bg-grassA5 text-grass10'
                                }`}>
                                  {tx.type === 'send' ? (
                                    <ArrowUpRight size={16} strokeWidth={3} />
                                  ) : (
                                    <ArrowDownLeft size={16} strokeWidth={3} />
                                  )}
                                  {tx.status === 'success' && (
                                    <Flex align={'center'} justify={'center'} className={`absolute -bottom-2 -right-2 size-5 rounded-full bg-grass10 text-white`}>
                                      <Check size={14} strokeWidth={4} />
                                    </Flex>
                                  )}
                                </div>
                                <IconButton className={'absolute right-0 top-0'} radius={'large'} size={'1'} variant={'soft'}>
                                  {/*<LucideEllipsisVertical size={14} strokeWidth={2} />*/}
                                  <TransactionDetailsDialog tx={{...tx, currentChainId}} />
                                </IconButton>
                                <div className="flex-1">
                                  <Flex align={'center'} gap={'1'}>
                                    <Text color={'gray'} className="capitalize" size={'2'} weight={'medium'}>{tx.type}</Text>
                                    <Text size={'2'} className="">{tx.value ? parseFloat(formatEther(tx.value as any)) : '0.0000'} ETH</Text>
                                  </Flex>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Text color={'gray'} size={'1'}>{formatTimestamp(tx.timestamp)}</Text>
                                    {isGasSponsored(tx) && tx.status === 'success' && (
                                      <Badge color="green" variant="soft" size="1">
                                        <Zap size={12} />
                                        Gas Sponsored
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Flex>
                            </div>

                            {/* Transaction Details */}
                            <div className="ml-11 space-y-2">
                              <Flex align={'center'} gap={'4'}>
                                <Text color={'gray'} size={'1'}>Block: {tx.blockNumber?.toLocaleString()}</Text>
                                {tx.gasUsed && (
                                  <Text color={'gray'} size={'1'}>Gas Used: {parseFloat(tx.gasUsed).toLocaleString()}</Text>
                                )}
                              </Flex>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        {/*</div>*/}
      </PageBody>
      <BottomNavigation />
    </PageContainer>
  )
}
