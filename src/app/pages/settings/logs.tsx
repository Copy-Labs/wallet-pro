import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {ArrowLeft, Clock, CheckCircle, XCircle, FileText, Trash2, Check} from "lucide-react"
import {
  Badge,
  Button, Card,
  Flex,
  Text, Tooltip
} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"

import { TransactionLogger, type TransactionLog } from "~/services/transactionLogger"
import { formatAddress, formatBalance } from "~/utils"
import { toast } from "sonner"
import { getActiveAccount } from "~services/wallet"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";

export function SettingsLogsPage() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<TransactionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{total: number, success: number, failed: number, pending: number} | null>(null)

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [])

  const loadLogs = async () => {
    try {
      const account = await getActiveAccount()
      if (account) {
        const transactionLogs = await TransactionLogger.getAccountTransactions(account.id)
        setLogs(transactionLogs)
      } else {
        console.warn('No active account found for transaction logs')
        setLogs([])
      }
    } catch (error) {
      console.error('Failed to load transaction logs:', error)
      toast.error('Failed to load transaction logs')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const dbStats = await TransactionLogger.getStats()
      setStats({
        total: dbStats.totalTransactions,
        success: dbStats.successfulTransactions,
        failed: dbStats.failedTransactions,
        pending: dbStats.pendingTransactions
      })
    } catch (error) {
      console.error('Failed to load log stats:', error)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all transaction logs? This action cannot be undone.')) {
      return
    }

    try {
      await TransactionLogger.clearAll()
      await loadLogs()
      await loadStats()
      toast.success('Transaction logs cleared')
    } catch (error) {
      console.error('Failed to clear logs:', error)
      toast.error('Failed to clear transaction logs')
    }
  }

  const getStatusIcon = (status: TransactionLog['status']) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending':
        return <Text color={'amber'}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M192,64V75.64A8,8,0,0,1,188.82,82L128,128,67.2,82.4A8,8,0,0,1,64,76V64Z" opacity="0.2"></path><path d="M184,24H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64V40A16,16,0,0,0,184,24Zm0,16V56H72V40Zm0,176H72V180l56-42,56,42.35Zm-56-98L72,76V72H184v3.64Z"></path></svg></Text>
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: TransactionLog['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="soft" className="bg-green-100 text-green-800">Success</Badge>
      case 'failed':
        return <Badge variant="soft" className="bg-red-100 text-red-800">Failed</Badge>
      case 'pending':
        return <Badge variant="soft" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return <Badge variant="soft">Unknown</Badge>
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-[600px] w-[375px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    )
  }

  return (
    <PageContainer>
      <PageHeader>
        <Flex align={'center'} justify={'between'} width={'100%'}>
          {/* Header */}
          <PageHeading>Transaction Logs</PageHeading>

          {logs.length > 0 && (
            <Tooltip content={"Clear Logs"}>
              <Button
                variant="ghost"
                size="1"
                title={'Clear Logs'}
                onClick={clearLogs}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Tooltip>
          )}
        </Flex>
      </PageHeader>

      <PageBody>
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Stats */}
          {stats && (
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <Flex align={'center'} className="" direction={'column'} gap={'1'}>
                  <Text className="text-2xl font-bold">{stats.total}</Text>
                  <Text color={'gray'} size={'1'} className="">Total</Text>
                </Flex>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="p-4">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <FileText className="w-16 h-16 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-medium mb-2">No Transaction Logs</h3>
                  <p className="text-muted-foreground text-sm">
                    Transaction history will appear here as you send ETH.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <Card
                    key={log.id}
                    className="p-4 rounded-lg space-y-3 transition-colors"
                    variant={'surface'}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className="font-medium capitalize">{log.type} Transaction</span>
                        {getStatusBadge(log.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-2 text-sm">
                      {log.hash && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hash:</span>
                          <span className="font-mono text-xs">{formatAddress(log.hash)}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-mono text-xs">{formatAddress(log.from)}</span>
                      </div>

                      {log.to && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">To:</span>
                          <span className="font-mono text-xs">{formatAddress(log.to)}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>{log.value} ETH</span>
                      </div>

                      {log.gasUsed && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gas Used:</span>
                          <span>{log.gasUsed}</span>
                        </div>
                      )}

                      {log.blockNumber && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Block:</span>
                          <span>{log.blockNumber}</span>
                        </div>
                      )}

                      {log.gasSponsorship && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Gas Sponsored:</span>
                          <Badge variant="soft" className="bg-green-100 text-green-800 text-xs">
                            ⚡ Yes
                          </Badge>
                        </div>
                      )}

                      {log.errorMessage && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-red-600">Error:</span>
                          <span className="text-red-600 text-xs">{log.errorMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Additional Data</summary>
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageBody>

      {/* Bottom Navigation */}
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
