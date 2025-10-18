import React from "react"
import { ArrowLeft, Copy } from "lucide-react"
import QRCode from "qrcode"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import { getActiveAccount } from "~services/wallet"
import { useNavigate } from "react-router-dom"
import {Button, Card, Flex, Text} from "@radix-ui/themes";
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";

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
    <PageContainer>
      <PageHeader showBackButton={false}>
        <PageHeading>Receive Address</PageHeading>
      </PageHeader>
      {/*<div className="min-h-[600px] w-[375px] flex flex-col">*/}
        {/*<WalletHeader title="Receive ETH" />*/}

      <PageBody>
        <div className="flex-1 overflow-auto">
          <div className="p-4 max-w-sm mx-auto">
            {/* Back button */}
            {/*<div className="flex items-center gap-2 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/accounts")}
                className="p-1 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">Receive Address</h2>
            </div>*/}

            {activeAccount ? (
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="Address QR Code"
                      className="rounded-lg p-4"
                    />
                  )}
                </div>

                {/* Address Display */}
                <Card>
                  <Flex direction={'column'}>
                    <Text color={'gray'} size={'1'} className="mb-2">Your ETH Address</Text>
                    <Text align={'center'} size={'1'} className="font-mono text-sm break-all" weight={'bold'}>
                      {activeAccount.address}
                    </Text>
                  </Flex>
                </Card>

                {/* Copy Button */}
                <Button
                  onClick={handleCopyAddress}
                  className="w-full"
                  variant="soft"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedAddress ? "Copied!" : "Copy Address"}
                </Button>

                {/* Instructions */}
                <div className="text-center text-sm space-y-2">
                  <Text color={'gray'}>Share this address to receive ETH</Text>
                  <Text color={'gray'}>Only send Ethereum (ETH) to this address</Text>
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
      </PageBody>
      <BottomNavigation />
      {/*</div>*/}
    </PageContainer>
  )
}
