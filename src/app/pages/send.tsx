import React from "react"
import {Send, Copy, Check, ArrowRight} from "lucide-react"
import {Callout, Heading, Text, Flex, Box, Button, Grid, Tooltip, IconButton, Card} from "@radix-ui/themes"
import { estimateSendGas, sendEth, checkGasSponsorship } from "~services/transaction"
import { getGasSponsorshipStatus } from "~utils/test-gas-sponsorship"
import { useNavigate, useLocation } from "react-router-dom"
import {PageBody, PageContainer, PageFooter, PageHeader, PageHeading} from "~components/PageContainer";
import { toast } from "sonner"
import CustomNumericKeypad from "~components/CustomNumericKeypad"
import { fetchEthBalance } from "~services/balance"
import { getSelectedNetwork, getCustomNetworkByChainId } from "~utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import {shortenAddress, toDecimalPlace} from "~/utils"
import type { WalletAccount } from "~/types/account"
import CopyTextComponent from "~components/CopyToClipboard";
import posthog from "posthog-js";

interface GasEstimate {
  estimatedCost: string
  estimatedCostUSD: string
}

interface SponsorshipCheck {
  canSponsor: boolean
  reason?: string
}

export function SendDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [amount, setAmount] = React.useState("")
  const [gasEstimate, setGasEstimate] = React.useState<GasEstimate | null>(null)
  const [sponsorshipCheck, setSponsorshipCheck] = React.useState<SponsorshipCheck | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [sendError, setSendError] = React.useState("")
  const [gasSponsorshipStatus, setGasSponsorshipStatus] = React.useState<{
    enabled: boolean
    status: string
    message: string
    icon: string
  } | null>(null)
  const [maxBalance, setMaxBalance] = React.useState<string>("0")
  const [usdValue, setUsdValue] = React.useState<string>("$0.00")
  const [actualEthAmount, setActualEthAmount] = React.useState<string>("0")
  const [validationErrors, setValidationErrors] = React.useState<string[]>([])

  posthog.capture('send page', { property: 'Sending details page' })

  // Get accounts from navigation state - support both internal and external transfers
  const { fromAccount, toAccount, recipientAddress } = location.state as {
    fromAccount: WalletAccount
    toAccount?: WalletAccount
    recipientAddress?: string
  }

  React.useEffect(() => {
    if (!fromAccount || (!toAccount && !recipientAddress)) {
      // Redirect back to selection if no accounts or recipient provided
      navigate('/send')
      return
    }

    getGasSponsorshipStatus().then(setGasSponsorshipStatus)
    loadMaxBalance()
  }, [fromAccount, toAccount, recipientAddress, navigate])

  const loadMaxBalance = async () => {
    try {
      const chainId = await getSelectedNetwork()

      let chain = defaultChain
      if (chainId) {
        // Check if it's a custom network first
        const customNetwork = await getCustomNetworkByChainId(chainId)
        if (customNetwork) {
          // Convert custom network to chain-like object
          chain = {
            id: customNetwork.chainId,
            name: customNetwork.name,
            nativeCurrency: customNetwork.currency,
            rpcUrls: {
              default: { http: [customNetwork.rpcUrl] },
              public: { http: [customNetwork.rpcUrl] },
            },
            blockExplorers: customNetwork.blockExplorerUrl ? {
              default: { name: 'Explorer', url: customNetwork.blockExplorerUrl },
            } : undefined,
          }
        } else {
          // Fall back to predefined chains
          chain = getChainById(chainId) || defaultChain
        }
      }

      const balance = await fetchEthBalance(fromAccount.address as `0x${string}`, chain)
      setMaxBalance(balance)

      // Calculate USD value (using hardcoded ETH price - could be improved with real API)
      const ethPriceUSD = 3000
      const usd = (parseFloat(balance) * ethPriceUSD).toFixed(2)
      setUsdValue(`$${usd}`)
    } catch (error) {
      console.error("Error loading balance:", error)
      setMaxBalance("0")
      setUsdValue("$0.00")
    }
  }

  const handleEstimateGas = async () => {
    if (!amount || !validateAmount(amount)) return

    setIsLoading(true)
    try {
      const recipientAddr = (recipientAddress || toAccount.address) as `0x${string}`
      const estimate = await estimateSendGas(fromAccount.id, recipientAddr, actualEthAmount)
      setGasEstimate(estimate)

      const sponsorship = await checkGasSponsorship(estimate.estimatedCostUSD)
      setSponsorshipCheck(sponsorship)
    } catch (error) {
      setSendError(`Failed to estimate gas: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendTransaction = async () => {
    if (!gasEstimate || !sponsorshipCheck) return

    // Additional validations before sending
    if (!validateRecipient() || !validateBalance()) {
      return
    }

    setIsLoading(true)
    setSendError("")

    try {
      const recipientAddr = recipientAddress || toAccount.address as `0x${string}`
      const useSponsor = sponsorshipCheck.canSponsor
      const txHash = await sendEth(fromAccount.id, recipientAddr, actualEthAmount, useSponsor)

      // Success - navigate to transactions
      toast.success("Transaction sent successfully!", {
        description: `Hash: ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`
      })
      navigate("/transactions")
    } catch (error) {
      setSendError(`Failed to send transaction: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Memoized validation functions to prevent infinite loops
  const validateAmountValue = React.useCallback((value: string, ethAmount: string, balance: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Check if empty
    if (!value || value.trim() === "") {
      errors.push("Amount is required")
      return { isValid: false, errors }
    }

    // Check if valid number
    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      errors.push("Please enter a valid number")
      return { isValid: false, errors }
    }

    // Check if greater than 0
    if (numValue <= 0) {
      errors.push("Amount must be greater than 0")
      return { isValid: false, errors }
    }

    // Check against balance
    const ethAmountNum = parseFloat(ethAmount) || 0
    const balanceNum = parseFloat(balance) || 0
    if (ethAmountNum > balanceNum) {
      errors.push("Amount exceeds available balance")
      return { isValid: false, errors }
    }

    // Check decimal places (max 6 for ETH)
    const decimalPlaces = (value.split('.')[1] || '').length
    if (decimalPlaces > 6) {
      errors.push("Maximum 6 decimal places allowed")
      return { isValid: false, errors }
    }

    return { isValid: true, errors: [] }
  }, [])

  const validateRecipientValue = React.useCallback((): boolean => {
    if (!recipientAddress && !toAccount) {
      return false
    }

    // Check for self-send
    if (toAccount && fromAccount.address.toLowerCase() === toAccount.address.toLowerCase()) {
      return false
    }

    return true
  }, [recipientAddress, toAccount, fromAccount.address])

  const validateBalanceValue = React.useCallback((): boolean => {
    const ethAmount = parseFloat(actualEthAmount) || 0
    const balance = parseFloat(maxBalance) || 0

    return ethAmount <= balance
  }, [actualEthAmount, maxBalance])

  // Wrapper functions that update state and return boolean
  const validateAmount = React.useCallback((value: string): boolean => {
    const result = validateAmountValue(value, actualEthAmount, maxBalance)
    setValidationErrors(result.errors)
    return result.isValid
  }, [validateAmountValue, actualEthAmount, maxBalance])

  const validateRecipient = React.useCallback((): boolean => {
    const isValid = validateRecipientValue()
    if (!isValid && recipientAddress) {
      setSendError("Cannot send to the same account")
    } else if (!isValid && !recipientAddress && !toAccount) {
      setSendError("No recipient specified")
    }
    return isValid
  }, [validateRecipientValue, recipientAddress, toAccount])

  const validateBalance = React.useCallback((): boolean => {
    const isValid = validateBalanceValue()
    if (!isValid) {
      setSendError("Insufficient balance for this transaction")
    }
    return isValid
  }, [validateBalanceValue])

  const handleEthValueChange = (ethValue: string) => {
    setActualEthAmount(ethValue)
  }

  // Real-time validation effect
  React.useEffect(() => {
    if (amount) {
      validateAmount(amount)
    } else {
      setValidationErrors([])
    }
  }, [amount, actualEthAmount, maxBalance])

  // Computed validation states (pure functions that don't modify state)
  const amountValidation = React.useMemo(() => {
    if (!amount) return { isValid: false, errors: [] }
    return validateAmountValue(amount, actualEthAmount, maxBalance)
  }, [amount, actualEthAmount, maxBalance, validateAmountValue])

  const recipientValidation = React.useMemo(() => {
    return validateRecipientValue()
  }, [validateRecipientValue])

  const balanceValidation = React.useMemo(() => {
    return validateBalanceValue()
  }, [validateBalanceValue])

  // Computed button states based on validation results
  const canEstimateGas = React.useMemo(() => {
    return amount && amountValidation.isValid && !isLoading
  }, [amount, amountValidation.isValid, isLoading])

  const canSendTransaction = React.useMemo(() => {
    return gasEstimate &&
           sponsorshipCheck &&
           amountValidation.isValid &&
           recipientValidation &&
           balanceValidation &&
           !isLoading
  }, [gasEstimate, sponsorshipCheck, amountValidation.isValid, recipientValidation, balanceValidation, isLoading])

  // Get button disabled reasons for tooltips
  const getEstimateGasDisabledReason = () => {
    if (isLoading) return "Estimating gas..."
    if (!amount) return "Enter an amount to estimate gas"
    if (validationErrors.length > 0) return validationErrors[0]
    return ""
  }

  const getSendTransactionDisabledReason = () => {
    if (isLoading) return "Processing transaction..."
    if (!gasEstimate) return "Estimate gas cost first"
    if (validationErrors.length > 0) return validationErrors[0]
    if (!validateRecipient()) return "Invalid recipient"
    if (!validateBalance()) return "Insufficient balance"
    return ""
  }

  const handleBack = () => {
    navigate('/send')
  }

  // Determine recipient display info
  const recipientName = recipientAddress ? `Address` : toAccount.name
  const recipientAddr = recipientAddress || toAccount.address

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>
          {/*<Button variant="ghost" size="sm" onClick={handleBack} className="p-0 h-auto mr-2">*/}
          {/*  <ArrowLeft className="h-4 w-4" />*/}
          {/*</Button>*/}
          Send to {recipientName}
        </PageHeading>
      </PageHeader>

      <PageBody>
        {/*<div className="flex-1 overflow-auto pb-16">*/}
          <div className="px-4 max-w-md mx-auto">
            {/* Gas sponsorship notice */}
            {gasSponsorshipStatus?.enabled && !amount && validationErrors.length === 0 && (
              <Callout.Root color="grass" size="1" className="mb-2">
                <Callout.Text>
                  You won't pay for transactions fees less than $1.
                </Callout.Text>
              </Callout.Root>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  /*<div key={index} className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-800 text-sm">
                    {error}
                  </div>*/
                  <Callout.Root color="red" size="1" className="mb-2">
                    <Callout.Text>{error}</Callout.Text>
                  </Callout.Root>
                ))}
              </div>
            )}

            {/* Error Message */}
            {sendError && (
              /*<div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-800 text-sm">
                {sendError}
              </div>*/
              <Callout.Root color="red" size="1" className="mb-2">
                <Callout.Text>{sendError}</Callout.Text>
              </Callout.Root>
            )}

            {gasEstimate && sponsorshipCheck && (
              <>
                {sponsorshipCheck?.canSponsor ? (
                  <Callout.Root color="green" size="1" className="mb-2">
                    <Callout.Text>Gas Sponsored! No fees for you.</Callout.Text>
                  </Callout.Root>
                ) : (
                  <Callout.Root color="amber" size="1" className="mb-2">
                    <Callout.Text>Gas fees will apply. {sponsorshipCheck?.reason}</Callout.Text>
                  </Callout.Root>
                )}
              </>
            )}

            <div className="space-y-4">
              {/* Account info display */}
              <Card mb="0">
                <Flex align={'center'} justify={'between'}>
                  <Flex direction={'column'} align={'start'} justify={'center'}>
                    <Flex align="center" gap="2">
                      <Text size="1" color="gray">From</Text>
                      <CopyTextComponent
                        textToCopy={fromAccount.address}
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
                      <Text color={'gray'} size={'1'} className="font-medium">{fromAccount.name}</Text>
                      <Text size={'2'}>{shortenAddress(fromAccount.address)}</Text>
                    </Flex>
                  </Flex>

                  <div className="flex items-center justify-center bg-gray11 rounded-full p-1">
                    <ArrowRight size={16} strokeWidth={4} />
                  </div>

                  <Flex direction={'column'} align={'end'} justify={'center'}>
                    <Flex align="center" gap="2">
                      <CopyTextComponent
                        textToCopy={recipientAddress}
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
                      <Text color={'gray'} size={'1'} className="font-medium">{recipientName}</Text>
                      <Text size={'2'}>{shortenAddress(recipientAddr)}</Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>

              <div hidden className="p-2 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Text size="2" color="gray">From:</Text>
                  {/*<div className="text-right">
                    <Text size="2" weight="bold">{fromAccount.name}</Text>
                    <Text size="1" color="gray">{shortenAddress(fromAccount.address)}</Text>
                  </div>*/}
                  <Flex align={'end'} direction={'column'} gap={'0'}>
                    <Text color={'gray'} size={'1'} className="font-medium">{fromAccount.name}</Text>
                    <Text size={'2'}>{shortenAddress(fromAccount.address)}</Text>
                  </Flex>
                </div>

                {/*<div className="flex items-center justify-center">
                  <ArrowUpDown className="h-4 w-4" />
                </div>*/}

                <div className="flex items-center justify-between">
                  <Text size="2" color="gray">To:</Text>
                  {/*<div className="text-right">
                    <Text size="2" weight="bold">{recipientName}</Text>
                    <Text size="1" color="gray">{shortenAddress(recipientAddr)}</Text>
                  </div>*/}
                  <Flex align={'end'} direction={'column'} gap={'0'}>
                    <Text color={'gray'} size={'1'} className="font-medium">{recipientName}</Text>
                    <Text size={'2'}>{shortenAddress(recipientAddr)}</Text>
                  </Flex>
                </div>
              </div>

              {/* Amount Input with CustomNumericKeypad */}
              <div className={''}>
                {/*<Text size="3" weight="bold" className="mb-3 block">Amount (ETH)</Text>*/}
                <CustomNumericKeypad
                  maxValue={maxBalance}
                  inputValue={amount}
                  setInputValue={setAmount}
                  tokenSymbol="ETH"
                  maxLength={12}
                  onEthValueChange={handleEthValueChange}
                />

                {/* Max Balance Display */}
                {/*<div className="mt-2 p-3 rounded-lg">
                  <Text size="2" className="text-center">
                    <Text size="2" color="blue" weight="bold">
                      Max Balance:
                      {maxBalance} ETH ({usdValue})
                    </Text>
                  </Text>
                </div>*/}
                <Flex direction={"column"} align={"start"} gap={"0"} px={"2"}>
                  <Text size={"2"}>Max Balance:</Text>
                  <Heading size={"4"} align={"center"}>
                    {toDecimalPlace(Number(maxBalance), 6)}{" "}
                    {/*<Text size={"6"} color={"gray"}>*/}
                    {/*  {routeTokenSymbol?.toLocaleUpperCase()}*/}
                    {/*</Text>{" "}*/}
                    {/* Display the Dollar equivalent here in amber color */}
                    <Text weight={"regular"} size={"3"} align={"center"} color={"gray"} style={{ opacity: "0.8" }}>
                      ({usdValue})
                    </Text>
                  </Heading>
                </Flex>
              </div>

              {/* Gas Estimate Display */}
              {gasEstimate && sponsorshipCheck && (
                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gas Cost (est.):</span>
                      <span className="font-medium">{gasEstimate.estimatedCost} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gas Cost (USD):</span>
                      <span className="font-medium">${gasEstimate.estimatedCostUSD}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        {/*</div>*/}
      </PageBody>
      <PageFooter>
        {/* Action Buttons */}
        <Grid columns={'2'} className={'h-auto'} gap={'2'} p={'2'} width={'100%'}>
          <Box height="48px">
            <Tooltip content={getEstimateGasDisabledReason()}>
              <Button
                highContrast
                onClick={handleEstimateGas}
                disabled={!canEstimateGas}
                variant="solid"
                className={'w-full'}
              >
                {isLoading ? "Estimating..." : "Estimate Gas"}
              </Button>
            </Tooltip>
          </Box>

          <Box height="48px">
            <Tooltip content={getSendTransactionDisabledReason()}>
              <Button
                className={'w-full'}
                color={'grass'}
                onClick={handleSendTransaction}
                disabled={!canSendTransaction}
              >
                <Send className="w-4 h-4" />
                {isLoading ? "Sending..." : "Send Transaction"}
              </Button>
            </Tooltip>
          </Box>
        </Grid>
      </PageFooter>
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
