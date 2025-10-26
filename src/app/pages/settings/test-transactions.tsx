import React from "react"
import {
  ArrowLeftRight, ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, Clock, ExternalLink, Copy, Search, Zap,
  Loader, AlertCircle, PlayCircle, PlusCircle
} from "lucide-react"
import { Input } from "~components/ui/input"
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  IconButton, ScrollArea,
  Text,
  TextField
} from "@radix-ui/themes"
import { PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import { useNavigate } from "react-router-dom"
import CopyTextComponent from "~components/CopyToClipboard";
import {formatAddress, formatBalance, formatDate, formatTimestamp, shortenAddress} from "~utils";
import {useUIStore, useActiveAccount, useSelectedNetwork} from "~/store/ui-store"
import {getChainById, defaultChain} from "~/config/chains"
import {
  getRpcUrl,
  getAvailableProviders,
  SUPPORTED_RPC_PROVIDERS,
  type RpcProviderType
} from "~/config/rpc-providers"
import {getTransactions, type NormalizedTransaction} from "~/services/advancedTransaction"

interface UITransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  blockNumber: bigint;
  timestamp: number;
  isInternal: boolean;
  type: 'send' | 'receive';
  status: 'success' | 'failed' | 'pending';
}

// Convert NormalizedTransaction to UI format
function convertNormalizedTransaction(tx: NormalizedTransaction): UITransaction {
  // For demo purposes, we'll assume send/receive based on active account
  // In a real implementation, you'd need to check against account address
  return {
    ...tx,
    type: 'send', // Placeholder - would need logic to determine direction
    status: 'success' // Placeholder - would need logic to determine status
  }
}

export function SettingsTestTransactionsPage() {
  const navigate = useNavigate()

  // Use global UIStore selectors instead of local state
  const activeAccount = useActiveAccount()
  const currentNetwork = useSelectedNetwork()

  const [transactions, setTransactions] = React.useState<UITransaction[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = React.useState<RpcProviderType>('ankr')
  const [availableProviders, setAvailableProviders] = React.useState<RpcProviderType[]>([])

  // Set Ankr as default when component mounts
  React.useEffect(() => {
    setSelectedProvider('ankr')
  }, []) // Run once on mount

  // Initialize available providers when network changes
  React.useEffect(() => {
    if (currentNetwork) {
      console.log('Checking available providers for chain:', currentNetwork.id, currentNetwork.name)
      const available = getAvailableProviders(currentNetwork.id)
      console.log('Available providers:', available)
      setAvailableProviders(available)

      // Prefers Ankr as default, falls back to available[0]
      if (available.includes('ankr')) {
        setSelectedProvider('ankr')
      } else if (!available.includes(selectedProvider)) {
        setSelectedProvider(available[0] || 'ankr')
      }
    }
  }, [currentNetwork])

  // Subscribe to store changes for real-time updates
  React.useEffect(() => {
    const unsubscribeNetwork = useUIStore.subscribe(
      (state) => state.selectedNetwork.id,
      async (newChainId) => {
        console.log('Network changed in test page, reloading transactions for chain:', newChainId)
        setTransactions([]) // Clear transactions when network changes
        setError(null)
      }
    )

    const unsubscribeAccount = useUIStore.subscribe(
      (state) => state.activeAccount?.id,
      async (newAccountId) => {
        console.log('Account changed in test page, clearing transactions')
        setTransactions([]) // Clear transactions when account changes
        setError(null)
      }
    )

    return () => {
      unsubscribeNetwork()
      unsubscribeAccount()
    }
  }, [])

  const loadTransactions = async () => {
    if (!activeAccount || !currentNetwork) {
      setError('Account or network not loaded')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rpcUrl = getRpcUrl(currentNetwork, selectedProvider)
      console.log("Test transaction", activeAccount, "using provider:", selectedProvider, "RPC URL:", rpcUrl)
      const normalizedTxs = await getTransactions(
        activeAccount.address,
        currentNetwork.id,
        rpcUrl,
        {
          fromBlock: 0n,
          includeInternal: true,
          concurrency: 4,
          useCache: true,
        }
      )

      const uiTransactions = normalizedTxs.map(convertNormalizedTransaction)
      setTransactions(uiTransactions)
    } catch (err) {
      console.error('Error loading transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const formatBalance = (value: string) => {
    const num = parseFloat(value)
    if (num === 0) return "0.0000"
    if (num < 0.0001) return "< 0.0001"
    return num.toFixed(4)
  }

  const groupTransactionsByDate = (txs: UITransaction[]) => {
    const groups: { [key: string]: UITransaction[] } = {}

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

  const TransactionDetailsDialog = ({ tx }: { tx: UITransaction }) => {
    const getExplorerUrl = (txHash: string) => {
      const chain = getChainById(currentNetwork?.id) || defaultChain
      return `${chain.blockExplorers?.default.url}/tx/${txHash}`
    }

    return (
      <IconButton className={'absolute right-0 top-0'} radius={'large'} size={'1'} variant={'soft'}>
        <Copy size={14} strokeWidth={2} />
      </IconButton>
    )
  }

  return (
    <PageContainer>
      <PageHeader showBackButton={true}>
        <PageHeading>Test Advanced Transactions</PageHeading>
      </PageHeader>
      <PageBody>
        <div className="p-4 space-y-4">
          {/* Account & Network Info */}
          {(activeAccount || currentNetwork) && (
            <Card className="p-4">
              <Flex direction={'column'} gap={'3'}>
                <Heading size={'3'}>Test Configuration</Heading>
                {activeAccount && (
                  <Flex align={'center'} gap={'2'}>
                    <Text color={'gray'} size={'2'}>Account:</Text>
                    <Text size={'2'} className="font-mono">{shortenAddress(activeAccount.address)}</Text>
                    <CopyTextComponent
                      textToCopy={activeAccount.address}
                      icon={<IconButton size="1" variant="ghost"><Copy size={12} /></IconButton>}
                    />
                  </Flex>
                )}
                {currentNetwork && (
                  <Flex align={'center'} gap={'2'}>
                    <Text color={'gray'} size={'2'}>Network:</Text>
                    <Badge color="blue" variant="soft">{currentNetwork.name}</Badge>
                    <Text color={'gray'} size={'2'}>({currentNetwork.id})</Text>
                  </Flex>
                )}
              </Flex>
            </Card>
          )}

          {/* RPC Provider Selection */}
          <Card className="p-4">
            <Flex direction={'column'} gap={'3'}>
                <Heading size={'3'}>RPC Provider Selection</Heading>
                <Text color={'gray'} size={'1'}>
                  Choose which RPC provider to use for fetching transactions. Each provider has different rate limits and performance characteristics.
                </Text>

                <div className="grid grid-cols-1 gap-2">
                  {(availableProviders.length === 0 ? ['ankr', 'alchemy', 'infura', 'public'] : availableProviders).map((providerType) => {
                    const provider = SUPPORTED_RPC_PROVIDERS[providerType]
                    return (
                      <Card
                        key={providerType}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedProvider === providerType
                            ? 'ring-2 ring-blue-500'
                            : ''
                        }`}
                        onClick={() => setSelectedProvider(providerType)}
                      >
                        <Flex align={'center'} justify={'between'}>
                          <Flex align={'center'} gap={'3'}>
                            <Badge
                              color={selectedProvider === providerType ? 'blue' : 'gray'}
                              variant={selectedProvider === providerType ? 'solid' : 'soft'}
                            >
                              {selectedProvider === providerType ? 'Selected' : 'Available'}
                            </Badge>
                            <div>
                              <Text size={'2'} weight={'medium'}>{provider.name}</Text>
                              {provider.limits?.description && (
                                <Text color={'gray'} size={'1'}>{provider.limits.description}</Text>
                              )}
                            </div>
                          </Flex>
                          <Flex direction={'column'} align={'end'}>
                            {provider.limits?.maxBlockRange && (
                              <Text color={'gray'} size={'1'}>
                                Max {provider.limits.maxBlockRange} block range
                              </Text>
                            )}
                            {provider.limits?.requestsPerSecond && (
                              <Text color={'gray'} size={'1'}>
                                {provider.limits.requestsPerSecond} req/sec
                              </Text>
                            )}
                          </Flex>
                        </Flex>
                      </Card>
                    )
                  })}
                </div>

                {/* Current Provider Info */}
                {selectedProvider && SUPPORTED_RPC_PROVIDERS[selectedProvider] && (
                  <Flex align={'center'} gap={'2'} className="mt-2 p-3 rounded-md">
                    <Text color={'gray'} size={'1'}>Current Provider:</Text>
                    <Badge color="blue" variant="soft">{SUPPORTED_RPC_PROVIDERS[selectedProvider].name}</Badge>
                  </Flex>
                )}
              </Flex>
            </Card>
          {/* Controls */}
          <Card className="p-4">
            <Flex direction={'column'} gap={'3'}>
              <Heading size={'3'}>Test Controls</Heading>
              <Text color={'gray'} size={'1'}>
                This will load transactions for the active account using the advanced transaction service.
              </Text>
              <Button
                onClick={loadTransactions}
                disabled={loading || !activeAccount || !currentNetwork}
                size="3"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Load Transactions with {SUPPORTED_RPC_PROVIDERS[selectedProvider].name}
                  </>
                )}
              </Button>
            </Flex>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="p-4 border-red-200 bg-red-50">
              <Flex align={'center'} gap={'2'}>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <Text color={'red'} size={'2'}>{error}</Text>
              </Flex>
            </Card>
          )}

          {/* Transaction List */}
          {transactions.length > 0 ? (
            <div className="space-y-4">
              <Flex align={'center'} justify={'between'}>
                <Heading size={'3'}>Transactions ({transactions.length})</Heading>
                <Button variant="outline" size="1" onClick={loadTransactions}>
                  <ArrowLeftRight className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              </Flex>

              {Object.entries(groupTransactionsByDate(transactions))
                .sort(([a], [b]) => {
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
                    <Text color={'gray'} className="px-1" size={'1'}>{date}</Text>
                    <div className="space-y-2">
                      {txs.map((tx) => (
                        <Card key={tx.hash} className="transition-colors">
                          <div className="relative flex items-start justify-between mb-2">
                            <Flex align={'start'} className="" gap={'3'} width={'100%'}>
                              <div className={`relative p-2 rounded-full ${
                                tx.type === 'send'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-grassA5 text-grass10'
                              }`}>
                                {tx.type === 'send' ? (
                                  <ArrowUpRight size={16} strokeWidth={3} />
                                ) : (
                                  <ArrowDownLeft size={16} strokeWidth={3} />
                                )}
                                {tx.status === 'success' && (
                                  <Flex align={'center'} justify={'center'} className={`absolute -bottom-2 -right-2 size-5 rounded-full bg-grass10 text-white`}>
                                    <CheckCircle size={14} strokeWidth={4} />
                                  </Flex>
                                )}
                              </div>
                              <TransactionDetailsDialog tx={tx} />
                              <div className="flex-1">
                                <Flex align={'center'} gap={'1'}>
                                  <Text color={'gray'} className="capitalize" size={'2'} weight={'medium'}>{tx.type}</Text>
                                  <Text size={'2'} className="">{formatBalance(tx.value)} ETH</Text>
                                </Flex>
                                <div className="flex items-center gap-2 text-sm">
                                  <Text color={'gray'} size={'1'}>{formatTimestamp(tx.timestamp)}</Text>
                                  {tx.isInternal && (
                                    <Badge color="purple" variant="soft" size="1">
                                      Internal
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
                              <Text color={'gray'} size={'1'}>Hash: {formatAddress(tx.hash)}</Text>
                            </Flex>
                            <Flex align={'center'} gap={'4'}>
                              <Text color={'gray'} size={'1'}>From: {shortenAddress(tx.from)}</Text>
                              {tx.to && <Text color={'gray'} size={'1'}>To: {shortenAddress(tx.to)}</Text>}
                            </Flex>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : !loading && !error && (
            <Card className="p-8">
              <Flex direction={'column'} align={'center'} justify={'center'} gap={'3'}>
                <ArrowLeftRight className="w-12 h-12 mx-auto opacity-50" />
                <Heading size={'2'}>No Transactions Yet</Heading>
                <Text align={'center'} className="text-gray-600">
                  Click "Load Transactions" to test the advanced transaction service
                </Text>
              </Flex>
            </Card>
          )}
        </div>
      </PageBody>
    </PageContainer>
  )
}
