import { Flex, Heading, Tabs, Text, Theme } from "@radix-ui/themes"
import { useState, useEffect, useRef } from "react"

import { ThemeProvider } from "~components/theme-provider"
import { AccountsTab } from "~components/wallet/accounts-tab"
import { NetworksTab } from "~components/wallet/networks-tab"
import { SettingsTab } from "~components/wallet/settings-tab"
import { TransactionsTab } from "~components/wallet/transactions-tab"
import { ConnectDialog } from "~components/dapp/connect-dialog"
import { TransactionDialog } from "~components/dapp/transaction-dialog"
import { Button } from "~components/ui/button"
import { getAllAccounts } from "~services/wallet"
import { getSelectedNetwork, addDAppPermission, getDAppPermission } from "~utils/storage"
import { estimateSendGas, checkGasSponsorship } from "~services/transaction"
import { sendEth } from "~services/transaction"
import type { WalletAccount, GasEstimate, SponsorshipCheck } from "~types/account"

import "~styles/globals.css"

function IndexPopup() {
  // DApp request state
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<any>(null)
  const [connectedAccount, setConnectedAccount] = useState<WalletAccount | null>(null)
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | undefined>()
  const [sponsorship, setSponsorship] = useState<SponsorshipCheck | undefined>()
  const [isProcessingTx, setIsProcessingTx] = useState(false)

  const portRef = useRef<chrome.runtime.Port | null>(null)

  // Load initial data
  useEffect(() => {
    getAllAccounts().then(setAccounts)

    // Connect to background script
    const port = chrome.runtime.connect({ name: "popup" })
    portRef.current = port

    port.onMessage.addListener(handleMessage)

    // Cleanup on unmount
    return () => {
      port.disconnect()
    }
  }, [])

  const handleMessage = async (message: any) => {
    if (message.type === "ETH_REQUEST") {
      setCurrentRequest(message)

      if (message.request.method === "eth_requestAccounts") {
        // Check if we already have permission for this origin
        const existingPermission = await getDAppPermission(message.origin)
        if (existingPermission) {
          // Find the connected account
          const account = accounts.find(acc => acc.id === existingPermission.accountId)
          if (account) {
            respondToRequest({
              result: [account.address],
              error: null
            })
            return
          }
        }
        setConnectDialogOpen(true)
      } else if (message.request.method === "eth_sendTransaction") {
        await handleTransactionRequest(message)
      }
    }
  }

  const handleTransactionRequest = async (message: any) => {
    const transaction = message.request.params[0]

    // Get the connected account for this origin
    let account: WalletAccount | undefined
    
    // Check if we have a stored permission for this origin
    const permission = await getDAppPermission(message.origin)
    if (permission) {
      account = accounts.find(acc => acc.id === permission.accountId)
    }
    
    // Fallback to first account if no permission found
    if (!account) {
      account = accounts[0]
    }
    
    if (!account) return

    setConnectedAccount(account)

    // Estimate gas and check sponsorship if it's an ETH transfer
    if (transaction.to && transaction.value && !transaction.data) {
      try {
        const recipient = transaction.to as `0x${string}`
        const amount = formatEther(transaction.value)

        const estimate = await estimateSendGas(
          account.id,
          recipient,
          amount
        )

        const sponsorCheck = await checkGasSponsorship(estimate.estimatedCostUSD)

        setGasEstimate(estimate)
        setSponsorship(sponsorCheck)
      } catch (error) {
        console.error("Error estimating gas:", error)
      }
    }

    setTransactionDialogOpen(true)
  }

  const handleConnectAccount = async (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId)
    if (account && currentRequest) {
      // Save permission for this origin
      await addDAppPermission(currentRequest.origin, accountId)

      setConnectedAccount(account)
      respondToRequest({
        result: [account.address],
        error: null
      })
    }
  }

  const handleRejectConnection = () => {
    respondToRequest({
      result: null,
      error: { message: "User rejected connection" }
    })
  }

  const handleApproveTransaction = async () => {
    if (!currentRequest || !connectedAccount) return

    setIsProcessingTx(true)

    try {
      const transaction = currentRequest.request.params[0]

      // For now, only handle ETH transfers
      if (transaction.to && transaction.value && !transaction.data) {
        const recipient = transaction.to as `0x${string}`
        const amount = formatEther(transaction.value)

        const txHash = await sendEth(connectedAccount.id, recipient, amount)

        respondToRequest({
          result: txHash,
          error: null
        })
      } else {
        respondToRequest({
          result: null,
          error: { message: "Transaction type not supported" }
        })
      }
    } catch (error) {
      respondToRequest({
        result: null,
        error: { message: error.message || "Transaction failed" }
      })
    } finally {
      setIsProcessingTx(false)
      setTransactionDialogOpen(false)
    }
  }

  const handleRejectTransaction = () => {
    respondToRequest({
      result: null,
      error: { message: "User rejected transaction" }
    })
    setTransactionDialogOpen(false)
  }

  const respondToRequest = (response: { result: any; error: any }) => {
    if (portRef.current && currentRequest) {
      portRef.current.postMessage({
        type: "ETH_RESPONSE",
        id: currentRequest.id,
        result: response.result,
        error: response.error,
        tabId: currentRequest.tabId
      })
    }
  }

  // Helper to convert wei to ether
  const formatEther = (wei: string) => {
    return (parseInt(wei, 16) / 1e18).toString()
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      <Theme accentColor="gray" className="min-h-[600px] w-[375px]" radius="large">
        <div className="flex flex-col h-full">
          {/* Header */}
          <Flex px={'2'} py={'3'}>
            <Heading color={'grass'}>Smart Wallet Pro</Heading>
            <Text color={'gray'} size={'2'}>Your Web3 companion</Text>
          </Flex>

          {/* Tab Navigation */}
          <Tabs.Root defaultValue="accounts" className="flex-1 flex flex-col">
            <Tabs.List className="grid w-full grid-cols-4 rounded-none">
              <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
              <Tabs.Trigger value="transactions">Send/Receive</Tabs.Trigger>
              <Tabs.Trigger value="networks">Networks</Tabs.Trigger>
              <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            </Tabs.List>

            <div className="flex-1 overflow-auto">
              <Tabs.Content value="accounts" className="m-0">
                <AccountsTab />
              </Tabs.Content>

              <Tabs.Content value="transactions" className="m-0">
                <TransactionsTab />
              </Tabs.Content>

              <Tabs.Content value="networks" className="m-0">
                <NetworksTab />
              </Tabs.Content>

              <Tabs.Content value="settings" className="m-0">
                <SettingsTab />
              </Tabs.Content>
            </div>
          </Tabs.Root>

          {/* DApp Dialogs */}
          <ConnectDialog
            isOpen={connectDialogOpen}
            onClose={() => setConnectDialogOpen(false)}
            origin={currentRequest?.origin || ""}
            accounts={accounts}
            onConnect={handleConnectAccount}
            onReject={handleRejectConnection}
          />

          <TransactionDialog
            isOpen={transactionDialogOpen}
            onClose={() => setTransactionDialogOpen(false)}
            origin={currentRequest?.origin || ""}
            transaction={currentRequest?.request?.params?.[0] || {}}
            accountName={connectedAccount?.name || ""}
            accountAddress={connectedAccount?.address || ""}
            gasEstimate={gasEstimate}
            sponsorship={sponsorship}
            onApprove={handleApproveTransaction}
            onReject={handleRejectTransaction}
            isProcessing={isProcessingTx}
          />
        </div>
      </Theme>
    </ThemeProvider>
  )
}

export default IndexPopup
