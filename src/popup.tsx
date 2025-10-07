import { Flex, Heading, Tabs, Text, Theme } from "@radix-ui/themes"
import { useState, useEffect, useRef } from "react"

import { ThemeProvider } from "~components/theme-provider"
import { AccountsTab } from "~components/wallet/accounts-tab"
import { NetworksTab } from "~components/wallet/networks-tab"
import { SettingsTab } from "~components/wallet/settings-tab"
import { TransactionsTab } from "~components/wallet/transactions-tab"
import { TransactionDialog } from "~components/dapp/transaction-dialog"
import { Toaster } from "~components/ui/toaster"
import { getAllAccounts } from "~services/wallet"
import { getSelectedNetwork, getDAppPermission } from "~utils/storage"
import { estimateSendGas, checkGasSponsorship } from "~services/transaction"
import { sendEth } from "~services/transaction"
import type { WalletAccount, GasEstimate, SponsorshipCheck } from "~types/account"

import "~styles/globals.css"

function IndexPopup() {
  // DApp request state - Only transactions now (wallet connection handled by content script overlay)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
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
    console.log('📨 Popup received message:', message.type, message)

    if (message.type === "ETH_REQUEST") {
      setCurrentRequest(message)

      if (message.request.method === "eth_sendTransaction") {
        console.log('💸 Processing transaction request from:', message.origin)
        await handleTransactionRequest(message)
      }
      // Note: eth_requestAccounts is now handled by content script overlay
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

          {/* DApp Transaction Dialogs - Wallet connection now handled by content script overlay */}
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

          <Toaster />
        </div>
      </Theme>
    </ThemeProvider>
  )
}

export default IndexPopup
