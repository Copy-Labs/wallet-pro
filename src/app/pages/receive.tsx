import React from "react"
import { ArrowLeft, Copy } from "lucide-react"
import { Button } from "~components/ui/button"
import QRCode from "qrcode"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import { getActiveAccount } from "~services/wallet"
import { useNavigate } from "react-router-dom"

export function ReceivePage() {
  const navigate = useNavigate()
  const [activeAccount, setActiveAccount] = React.useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>("")
  const [copiedAddress, setCopiedAddress] = React.useState(false)

  React.useEffect(() => {
    const loadAccount = async () => {
      try {
        const account = await getActiveAccount()
        setActiveAccount(account)
        await generateQRCode(account?.address)
      } catch (error) {
        console.error("Error loading account:", error)
      }
    }

    loadAccount()
  }, [])

  const generateQRCode = async (address: string) => {
    if (address) {
      try {
        const qrDataUrl = await QRCode.toDataURL(address, {
          width: 250,
          margin: 2,
          color: {
            dark: '#1a1a1a',
            light: '#ffffff'
          }
        })
        setQrCodeUrl(qrDataUrl)
      } catch (error) {
        console.error("Error generating QR code:", error)
      }
    }
  }

  const handleCopyAddress = async () => {
    if (activeAccount?.address) {
      await navigator.clipboard.writeText(activeAccount.address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  return (
    <div className="min-h-[600px] w-[375px] flex flex-col bg-white">
      <WalletHeader title="Receive ETH" />

      <div className="flex-1 overflow-auto pb-16">
        <div className="p-4 max-w-sm mx-auto">
          {/* Back button */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/accounts")}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">Receive Address</h2>
          </div>

          {activeAccount ? (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="Address QR Code"
                    className="border-2 border-gray-200 rounded-lg p-4"
                  />
                )}
              </div>

              {/* Address Display */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Your ETH Address</p>
                <p className="font-mono text-sm break-all text-gray-800">
                  {activeAccount.address}
                </p>
              </div>

              {/* Copy Button */}
              <Button
                onClick={handleCopyAddress}
                className="w-full"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copiedAddress ? "Copied!" : "Copy Address"}
              </Button>

              {/* Instructions */}
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>Share this address to receive ETH</p>
                <p>Only send Ethereum (ETH) to this address</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">⚠️</div>
              <p>No active account selected</p>
              <Button onClick={() => navigate("/accounts")} className="mt-4">
                Go to Accounts
              </Button>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
