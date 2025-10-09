import React from "react"
import { ArrowLeft, Send } from "lucide-react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import { Callout } from "@radix-ui/themes"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import { getActiveAccount } from "~services/wallet"
import { estimateSendGas, sendEth, checkGasSponsorship } from "~services/transaction"
import { getGasSponsorshipStatus } from "~utils/test-gas-sponsorship"
import { useNavigate } from "react-router-dom"

interface GasEstimate {
  estimatedCost: string
  estimatedCostUSD: number
}

interface SponsorshipCheck {
  canSponsor: boolean
  reason?: string
}

export function SendPage() {
  const navigate = useNavigate()
  const [recipient, setRecipient] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [gasEstimate, setGasEstimate] = React.useState<GasEstimate | null>(null)
  const [sponsorshipCheck, setSponsorshipCheck] = React.useState<SponsorshipCheck | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [sendError, setSendError] = React.useState("")
  const [gasSponsorshipStatus] = React.useState(getGasSponsorshipStatus())

  const handleEstimateGas = async () => {
    if (!recipient || !amount) return

    setIsLoading(true)
    try {
      const activeAccount = await getActiveAccount()
      if (!activeAccount) return

      const estimate = await estimateSendGas(activeAccount.id, recipient as `0x${string}`, amount)
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
      const activeAccount = await getActiveAccount()
      if (!activeAccount) return

      const useSponsor = sponsorshipCheck.canSponsor
      const txHash = await sendEth(activeAccount.id, recipient as `0x${string}`, amount, useSponsor)

      // Success - reset form and navigate to transactions
      setRecipient("")
      setAmount("")
      setGasEstimate(null)
      setSponsorshipCheck(null)

      alert(`Transaction sent successfully! Hash: ${txHash}`)
      navigate("/transactions")
    } catch (error) {
      setSendError(`Failed to send transaction: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[600px] w-[375px] flex flex-col bg-white">
      <WalletHeader title="Send ETH" />

      <div className="flex-1 overflow-auto pb-16">
        <div className="p-4 max-w-md mx-auto">
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
            <h2 className="text-lg font-semibold">Send Transaction</h2>
          </div>

          {/* Gas sponsorship notice */}
          {gasSponsorshipStatus.enabled && (
            <Callout.Root color="blue" size="1" className="mb-4">
              <Callout.Text>
                Gas fees are sponsored by Alchemy! You won't pay for transaction costs.
              </Callout.Text>
            </Callout.Root>
          )}

          <div className="space-y-4">
            {/* Recipient Address */}
            <div>
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount (ETH)</Label>
              <Input
                id="amount"
                type="number"
                step="0.0001"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Gas Estimate Display */}
            {gasEstimate && sponsorshipCheck && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
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

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                onClick={handleEstimateGas}
                disabled={!recipient || !amount || isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Estimating..." : "Estimate Gas"}
              </Button>

              <Button
                onClick={handleSendTransaction}
                disabled={!gasEstimate || isLoading}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? "Sending..." : "Send Transaction"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
