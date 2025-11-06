import React, { useState, useEffect, useMemo } from "react"
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  Card,
  Spinner,
  Badge,
  Dialog,
  Separator,
  IconButton
} from "@radix-ui/themes"
import { ArrowUpDownIcon, RefreshCwIcon, AlertCircleIcon, SettingsIcon } from "lucide-react"
import { PageContainer, PageHeader, PageHeading, PageBody } from "~components/PageContainer"
import { TokenSelector } from "~components/token/TokenSelector"
import { SwapSettingsModal } from "~components/swap/SwapSettingsModal"
import { ChainSelector } from "~components/swap/ChainSelector"
import { useUIStore } from "~store/ui-store"
import { fetchAccountBalance } from "~services/balance"
import { requestSwapQuote, sendPreparedCalls, getCallsStatus, signMessage, getCurrentChainId, requestCrossChainSwapQuote, sendCrossChainPreparedCalls } from "~services/swap"
import type { TokenBalance } from "~types/account"
import type { Address } from "viem"
import { toDecimalPlace } from "~utils"
import { toast } from "sonner"

// Token interface for swap
interface SwapToken {
  address: Address
  symbol: string
  name: string
  decimals: number
  balance: string
  usdPrice?: number
  usdValue?: number
}

export function SwapPage() {
  const { selectedNetwork, activeAccount } = useUIStore()

  // Token state
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)

  // Swap state
  const [fromToken, setFromToken] = useState<SwapToken | null>(null)
  const [toToken, setToToken] = useState<SwapToken | null>(null)
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [swapMode, setSwapMode] = useState<"exact-in" | "exact-out">("exact-in")
  const [swapType, setSwapType] = useState<"same-chain" | "cross-chain">("same-chain")
  const [toChain, setToChain] = useState<any>(null)

  // UI state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showFromTokenSelector, setShowFromTokenSelector] = useState(false)
  const [showToTokenSelector, setShowToTokenSelector] = useState(false)
  const [showToChainSelector, setShowToChainSelector] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  const [isPreparingSwap, setIsPreparingSwap] = useState(false)
  const [isSigningAndSendingPreparedCalls, setIsSigningAndSendingPreparedCalls] = useState(false)
  const [currentQuote, setCurrentQuote] = useState<any>(null)
  const [pendingCallsData, setPendingCallsData] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Swap settings
  const [swapSettings, setSwapSettings] = useState({
    slippageTolerance: 0.5, // 0.5%
    transactionDeadline: 20, // 20 minutes
    maxPriceImpact: 5.0 // 5%
  })
  const [estimatedPriceImpact, setEstimatedPriceImpact] = useState(0)

  // Initialize and fetch tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (!activeAccount) {
        setIsInitializing(false)
        return
      }

      setTokensLoading(true)
      try {
        const accountBalance = await fetchAccountBalance(activeAccount.address, selectedNetwork)
        setTokens(accountBalance.tokens)
        setIsInitializing(false)
      } catch (error) {
        console.error("Error fetching tokens:", error)
        setTokens([])
        setIsInitializing(false)
      } finally {
        setTokensLoading(false)
      }
    }

    fetchTokens()
  }, [activeAccount, selectedNetwork])

  // Convert tokens to SwapToken format
  const availableTokens = useMemo(() => {
    return tokens.map(token => ({
      address: token.address as Address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balance: token.balance,
      usdPrice: token.usdPrice,
      usdValue: token.usdValue,
    }))
  }, [tokens])

  // Transaction status tracking
  const [statusResult, setStatusResult] = useState<any>(null)
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false)
  const [statusError, setStatusError] = useState<any>(null)

  // Handle token swap
  const handleSwap = async () => {
    if (!activeAccount || !fromToken || !toToken) return

    // Validate balance
    const fromBalance = parseFloat(fromToken.balance)
    const requestedAmount = parseFloat(fromAmount)
    if (requestedAmount > fromBalance) {
      toast.error("Insufficient Balance", {
        description: `You only have ${toDecimalPlace(fromBalance, 4)} ${fromToken.symbol}`
      })
      return
    }

    setIsPreparingSwap(true)
    try {
      const chainId = selectedNetwork.id

      let swapParams: any = {
        from: activeAccount.address,
        chainId,
        fromToken: fromToken.address,
        toToken: toToken.address,
      }

      // Add cross-chain parameters if needed
      if (swapType === "cross-chain") {
        if (!toChain) {
          toast.error("Destination Chain Required", {
            description: "Please select a destination chain for cross-chain swap"
          })
          return
        }
        swapParams.toChainId = `0x${toChain.id.toString(16)}`
      }

      if (swapMode === "exact-in") {
        const amount = parseFloat(fromAmount)
        if (isNaN(amount) || amount <= 0) {
          toast.error("Invalid Amount", {
            description: "Please enter a valid amount to swap"
          })
          return
        }

        // Convert to hex with proper decimals
        const hexAmount = `0x${(amount * Math.pow(10, fromToken.decimals)).toString(16)}`
        swapParams.fromAmount = hexAmount
      } else {
        const amount = parseFloat(toAmount)
        if (isNaN(amount) || amount <= 0) {
          toast.error("Invalid Amount", {
            description: "Please enter a valid minimum amount to receive"
          })
          return
        }

        // Convert to hex with proper decimals
        const hexAmount = `0x${(amount * Math.pow(10, toToken.decimals)).toString(16)}`
        swapParams.minimumToAmount = hexAmount
      }

      // Calculate estimated price impact (simplified calculation)
      // In production, this would come from the API response
      if (fromToken?.usdPrice && toToken?.usdPrice && fromAmount) {
        const fromValue = parseFloat(fromAmount) * fromToken.usdPrice
        const estimatedToValue = fromValue * 0.995 // Assume 0.5% fee/slippage
        const estimatedToAmount = estimatedToValue / toToken.usdPrice
        const actualToValue = estimatedToAmount * toToken.usdPrice
        const priceImpact = ((fromValue - actualToValue) / fromValue) * 100
        setEstimatedPriceImpact(Math.max(0, priceImpact))
      }

      // Check if price impact exceeds maximum
      if (estimatedPriceImpact > swapSettings.maxPriceImpact) {
        toast.error("High Price Impact", {
          description: `Price impact (${estimatedPriceImpact.toFixed(2)}%) exceeds your maximum threshold of ${swapSettings.maxPriceImpact}%`
        })
        return
      }

      // Request swap quote using appropriate API
      const response = swapType === "cross-chain"
        ? await requestCrossChainSwapQuote(swapParams)
        : await requestSwapQuote(swapParams)

      console.log("Swap quote:", response.quote)

      // Show confirmation dialog with quote
      setShowConfirmDialog(true)

      // Store the response data for execution
      setPendingCallsData(response)
      setCurrentQuote(response.quote)

      toast.success("Quote Received", {
        description: "Review and confirm your swap details"
      })

    } catch (err: any) {
      console.error("Swap preparation failed:", err)
      toast.error("Quote Failed", {
        description: err.message || "Failed to get swap quote. Please try again."
      })
    } finally {
      setIsPreparingSwap(false)
    }
  }

  // Execute the swap
  const executeSwap = async () => {
    if (!pendingCallsData) return

    setIsSigningAndSendingPreparedCalls(true)
    try {
      // Sign the signature request
      const signature = await signMessage(pendingCallsData.signatureRequest.rawPayload)

      // Send prepared calls with signature
      const sendParams = {
        type: pendingCallsData.type,
        data: pendingCallsData.data,
        chainId: pendingCallsData.chainId,
        signature: {
          type: "secp256k1",
          data: signature
        }
      }

      // Send prepared calls using appropriate API
      const { preparedCallIds } = swapType === "cross-chain"
        ? await sendCrossChainPreparedCalls(sendParams)
        : await sendPreparedCalls(sendParams)

      console.log("Transaction sent:", preparedCallIds[0])

      setShowConfirmDialog(false)

      // Start tracking status
      setIsWaitingForConfirmation(true)
      setStatusError(null)

      // Poll for calls status
      const pollStatus = async () => {
        try {
          const statusResults = await getCallsStatus(preparedCallIds)
          const callStatusResult = statusResults[0]

          if (callStatusResult.status === 200) {
            // Success
            setStatusResult(callStatusResult)
            setIsWaitingForConfirmation(false)
            console.log(`${swapType === "cross-chain" ? "Cross-chain swap" : "Swap"} confirmed!`)
            console.log(`Transaction hash: ${callStatusResult.receipts?.[0]?.transactionHash}`)
          } else if (callStatusResult.status === 120) {
            // Cross-chain in progress
            console.log("Cross-chain swap in progress...")
            setTimeout(pollStatus, 5000) // Poll less frequently for cross-chain
          } else if (callStatusResult.status === 410) {
            // Cross-chain refund
            throw new Error("Cross-chain swap failed and was refunded")
          } else if (callStatusResult.status >= 400) {
            // Error
            throw new Error(`Transaction failed with status ${callStatusResult.status}`)
          } else {
            // Still pending, continue polling
            setTimeout(pollStatus, 2000)
          }
        } catch (error) {
          console.error("Status check failed:", error)
          setStatusError(error)
          setIsWaitingForConfirmation(false)
        }
      }

      // Start polling
      pollStatus()

    } catch (err: any) {
      console.error("Swap execution failed:", err)
      setStatusError(err)
      setIsWaitingForConfirmation(false)
      toast.error("Swap Failed", {
        description: err.message || "Transaction failed. Please try again."
      })
    } finally {
      setIsSigningAndSendingPreparedCalls(false)
    }
  }

  // Swap tokens (switch from/to)
  const swapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount("")
    setToAmount("")
  }

  if (isInitializing) {
    return (
      <PageContainer>
        <PageBody>
          <Flex direction="column" gap="3" align="center" p="4">
            <Spinner size="2" />
            <Text>Initializing swap client...</Text>
          </Flex>
        </PageBody>
      </PageContainer>
    )
  }

  if (!activeAccount) {
    return (
      <PageContainer>
        <PageBody>
          <Flex direction="column" gap="3" align="center" p="4">
            <Text>Please connect an account to use swap functionality</Text>
          </Flex>
        </PageBody>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader>
        <Flex justify="between" align="center">
          <PageHeading>Swap Tokens</PageHeading>
          <Flex gap="2">
            <Button
              size="2"
              variant={swapType === "same-chain" ? "solid" : "soft"}
              onClick={() => {
                setSwapType("same-chain")
                setToChain(null)
              }}
            >
              Same Chain
            </Button>
            <Button
              size="2"
              variant={swapType === "cross-chain" ? "solid" : "soft"}
              onClick={() => setSwapType("cross-chain")}
            >
              Cross Chain
            </Button>
          </Flex>
        </Flex>
      </PageHeader>

      <PageBody>
        <Flex direction="column" gap="4" maxWidth="400px" mx="auto">
          {/* From Token Section */}
          <Card variant={'ghost'}>
            <Flex direction="column" gap="3" p="4">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">From</Text>
                {fromToken && (
                  <Text size="2" color="gray">
                    Balance: {toDecimalPlace(parseFloat(fromToken.balance), 4)} {fromToken.symbol}
                  </Text>
                )}
              </Flex>

              <Flex gap="3" align="center">
                <TextField.Root
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  size="3"
                  disabled={swapMode === "exact-out"}
                >
                  <TextField.Slot>
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() => setSwapMode("exact-in")}
                      highContrast={swapMode === "exact-in"}
                    >
                      Exact In
                    </Button>
                  </TextField.Slot>
                </TextField.Root>

                <Button
                  variant="soft"
                  onClick={() => setShowFromTokenSelector(true)}
                  disabled={tokensLoading}
                >
                  {fromToken ? fromToken.symbol : "Select Token"}
                </Button>
              </Flex>
            </Flex>
          </Card>

          {/* Swap Button */}
          <Flex justify="center">
            <IconButton
              disabled={!fromToken || !toToken}
              radius={'large'}
              size="3"
              variant="soft"
              onClick={swapTokens}
            >
              <ArrowUpDownIcon size={16} strokeWidth={3} />
            </IconButton>
          </Flex>

          {/* To Token Section */}
          <Card variant={'ghost'}>
            <Flex direction="column" gap="3" p="4">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">To</Text>
                {toToken && (
                  <Text size="2" color="gray">
                    Balance: {toDecimalPlace(parseFloat(toToken.balance), 4)} {toToken.symbol}
                  </Text>
                )}
              </Flex>

              <Flex gap="3" align="center">
                <TextField.Root
                  placeholder="0.00"
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  size="3"
                  disabled={swapMode === "exact-in"}
                >
                  <TextField.Slot>
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() => setSwapMode("exact-out")}
                      highContrast={swapMode === "exact-out"}
                    >
                      Exact Out
                    </Button>
                  </TextField.Slot>
                </TextField.Root>

                <Button
                  variant="soft"
                  onClick={() => setShowToTokenSelector(true)}
                  disabled={tokensLoading}
                >
                  {toToken ? toToken.symbol : "Select Token"}
                </Button>
              </Flex>

              {/* Cross-chain destination chain selector */}
              {swapType === "cross-chain" && (
                <Flex gap="3" align="center" mt="2">
                  <Text size="2" color="gray">To Chain:</Text>
                  <Button
                    variant="soft"
                    onClick={() => setShowToChainSelector(true)}
                    size="2"
                  >
                    {toChain ? toChain.name : "Select Chain"}
                  </Button>
                </Flex>
              )}
            </Flex>
          </Card>

          {/* Cross-chain warning */}
          {swapType === "cross-chain" && (
            <Card>
              <Flex direction="column" gap="2" p="3">
                <Flex align="center" gap="2">
                  <AlertCircleIcon size={16} className="text-amber-600" />
                  <Text size="2" weight="bold" color="amber">
                    Cross-Chain Swap
                  </Text>
                </Flex>
                <Text size="2" color="gray">
                  Cross-chain swaps take longer and may have different fees. Post-swap actions are not supported.
                </Text>
              </Flex>
            </Card>
          )}

          {/* Price Impact Warning */}
          {estimatedPriceImpact > 0 && (
            <Card>
              <Flex direction="column" gap="2" p="3">
                <Flex justify="between" align="center">
                  <Text size="2" weight="bold">Estimated Price Impact</Text>
                  <Badge color={estimatedPriceImpact >= swapSettings.maxPriceImpact ? "red" : estimatedPriceImpact >= 2 ? "amber" : "green"}>
                    {estimatedPriceImpact.toFixed(2)}%
                  </Badge>
                </Flex>
                {estimatedPriceImpact >= swapSettings.maxPriceImpact && (
                  <Text size="2" color="red">
                    Price impact exceeds your maximum threshold of {swapSettings.maxPriceImpact}%
                  </Text>
                )}
              </Flex>
            </Card>
          )}

          {/* Status */}
          {statusResult && (
            <Card>
              <Flex direction="column" gap="2" p="3">
                <Flex align="center" gap="2">
                  <Text size="2">
                    {isWaitingForConfirmation
                      ? "Waiting for confirmation..."
                      : statusError
                        ? `Error: ${statusError.message || statusError}`
                        : statusResult.status === 200
                          ? (() => {
                              toast.success("Swap Successful!", {
                                description: "Your tokens have been swapped successfully"
                              })
                              return "Swap confirmed!"
                            })()
                          : `Status: ${statusResult.status}`}
                  </Text>
                  {isWaitingForConfirmation && <Spinner size="1" />}
                </Flex>
                {statusResult.receipts && statusResult.receipts[0] && (
                  <Text size="1" color="gray">
                    Transaction: {statusResult.receipts[0].transactionHash}
                  </Text>
                )}
              </Flex>
            </Card>
          )}
        </Flex>

        {/* Confirmation Dialog */}
        <Dialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <Dialog.Content>
            <Dialog.Title>Confirm Swap</Dialog.Title>
            <Dialog.Description>
              Review your swap details before proceeding.
            </Dialog.Description>

            {currentQuote && (
              <Flex direction="column" gap="3" mt="4">
                <Card>
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="bold">Swap Summary</Text>
                    <Separator />
                    <Flex justify="between">
                      <Text size="2">From:</Text>
                      <Text size="2">{fromAmount} {fromToken?.symbol}</Text>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2">To (minimum):</Text>
                      <Text size="2">{currentQuote.minimumToAmount} {toToken?.symbol}</Text>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2">Expires:</Text>
                      <Text size="2">{new Date(currentQuote.expiry * 1000).toLocaleString()}</Text>
                    </Flex>
                  </Flex>
                </Card>
              </Flex>
            )}

            <Flex gap="3" mt="4">
              <Dialog.Close>
                <Button variant="soft">Cancel</Button>
              </Dialog.Close>
              <Button onClick={executeSwap} loading={isSigningAndSendingPreparedCalls}>
                Confirm Swap
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>

        {/* Token Selectors */}
        <TokenSelector
          isOpen={showFromTokenSelector}
          onOpenChange={setShowFromTokenSelector}
          tokens={availableTokens}
          selectedToken={fromToken}
          onSelectToken={setFromToken}
          title="Select From Token"
        />

        <TokenSelector
          isOpen={showToTokenSelector}
          onOpenChange={setShowToTokenSelector}
          tokens={availableTokens}
          selectedToken={toToken}
          onSelectToken={setToToken}
          title="Select To Token"
        />

        {/* Swap Settings Modal */}
        <SwapSettingsModal
          isOpen={showSettingsModal}
          onOpenChange={setShowSettingsModal}
          settings={swapSettings}
          onSettingsChange={setSwapSettings}
          estimatedPriceImpact={estimatedPriceImpact}
        />

        {/* Chain Selector */}
        <ChainSelector
          isOpen={showToChainSelector}
          onOpenChange={setShowToChainSelector}
          selectedChain={toChain}
          onSelectChain={setToChain}
          title="Select Destination Chain"
          excludeChainId={selectedNetwork.id}
        />
      </PageBody>

      {/* Settings and Swap Controls */}
      <Flex gap="2" align="center" p={'2'}>
        <Button
          size="3"
          variant="soft"
          onClick={() => setShowSettingsModal(true)}
        >
          <SettingsIcon size={16} />
        </Button>

        <Button
          size="3"
          onClick={handleSwap}
          disabled={!fromToken || !toToken || (!fromAmount && !toAmount) || isSwapping}
          loading={isSwapping || isPreparingSwap}
          style={{ flex: 1 }}
        >
          {isSwapping ? "Getting Quote..." : "Get Quote"}
        </Button>
      </Flex>
    </PageContainer>
  )
}
