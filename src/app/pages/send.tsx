import React from "react"
import {ArrowLeft, Send, ArrowUpDown, Copy, Check, ArrowRight} from "lucide-react"
import {Callout, Heading, Text, Flex, Box, Button, Grid, Tooltip, IconButton, Card} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"
import { estimateSendGas, sendEth, checkGasSponsorship } from "~services/transaction"
import { getGasSponsorshipStatus } from "~utils/test-gas-sponsorship"
import { useNavigate, useLocation } from "react-router-dom"
import {PageBody, PageContainer, PageFooter, PageHeader, PageHeading} from "~components/PageContainer";
import { toast } from "sonner"
import CustomNumericKeypad from "~components/CustomNumericKeypad"
import { fetchEthBalance } from "~services/balance"
import { getSelectedNetwork } from "~utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import {shortenAddress, toDecimalPlace} from "~/utils"
import type { WalletAccount } from "~/types/account"
import CopyTextComponent from "~components/CopyToClipboard";

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
      const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain
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
    if (!amount) return

    setIsLoading(true)
    try {
      const recipientAddr = recipientAddress || toAccount.address as `0x${string}`
      const estimate = await estimateSendGas(fromAccount.id, recipientAddr, amount)
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

    setIsLoading(true)
    setSendError("")

    try {
      const recipientAddr = recipientAddress || toAccount.address as `0x${string}`
      const useSponsor = sponsorshipCheck.canSponsor
      const txHash = await sendEth(fromAccount.id, recipientAddr, amount, useSponsor)

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
            {gasSponsorshipStatus?.enabled && (
              <Callout.Root color="grass" size="1" className="mb-2">
                <Callout.Text>
                  Gas fees are sponsored for transactions less than $1! You won't pay for transaction costs.
                </Callout.Text>
              </Callout.Root>
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
              <div>
                {/*<Text size="3" weight="bold" className="mb-3 block">Amount (ETH)</Text>*/}
                <CustomNumericKeypad
                  maxValue={maxBalance}
                  inputValue={amount}
                  setInputValue={setAmount}
                  tokenSymbol="ETH"
                  maxLength={12}
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

                  {sponsorshipCheck.canSponsor ? (
                    <Callout.Root color="green" size="1">
                      <Callout.Text>Gas Sponsored! No fees for you.</Callout.Text>
                    </Callout.Root>
                  ) : (
                    <Callout.Root color="amber" size="1">
                      <Callout.Text>Gas fees will apply. {sponsorshipCheck.reason}</Callout.Text>
                    </Callout.Root>
                  )}
                </div>
              )}

              {/* Error Message */}
              {sendError && (
                <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-800 text-sm">
                  {sendError}
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
            <Button
              highContrast
              onClick={handleEstimateGas}
              disabled={!amount || isLoading}
              variant="solid"
              className={'w-full'}
            >
              {isLoading ? "Estimating..." : "Estimate Gas"}
            </Button>
          </Box>

          <Box height="48px">
            <Button
              className={'w-full'}
              color={'grass'}
              onClick={handleSendTransaction}
              disabled={!gasEstimate || isLoading}
            >
              <Send className="w-4 h-4" />
              {isLoading ? "Sending..." : "Send Transaction"}
            </Button>
          </Box>
        </Grid>
      </PageFooter>
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
