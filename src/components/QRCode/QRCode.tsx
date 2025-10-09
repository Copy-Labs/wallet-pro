import { Button, Card, Dialog, Flex, IconButton, Strong, Text } from "@radix-ui/themes"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import { getActiveAccount } from "~/services/wallet"
import { chainMetadata, defaultChain } from "~/config/chains"
import Link from "next/link"
import type { WalletAccount } from "~/types/account"

export default function QRCode() {
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null)
  const [currentChainId, setCurrentChainId] = useState(defaultChain.id)
  const [loading, setLoading] = useState(true)

  // Load the active account on mount
  useEffect(() => {
    const loadAccount = async () => {
      try {
        const account = await getActiveAccount()
        setActiveAccount(account)
        // For now, we'll hardcode to Sepolia (Sepolia is testnet, so matches the original logic)
        setCurrentChainId(11155111) // Sepolia chain ID
      } catch (error) {
        console.error("Error loading account:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [])

  // Helper function to get current network type
  const getNetworkType = () => {
    const metadata = chainMetadata[currentChainId]
    return metadata?.isTestnet ? "testnet" : "mainnet"
  }

  // Helper function to get blockchain name
  const getBlockchainName = () => {
    const metadata = chainMetadata[currentChainId]
    return metadata?.shortName || "Unknown"
  }

  const QRCodeIcon = () => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-qr-code"
      >
        <rect width="5" height="5" x="3" y="3" rx="1" />
        <rect width="5" height="5" x="16" y="3" rx="1" />
        <rect width="5" height="5" x="3" y="16" rx="1" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
        <path d="M21 21v.01" />
        <path d="M12 7v3a2 2 0 0 1-2 2H7" />
        <path d="M3 12h.01" />
        <path d="M12 3h.01" />
        <path d="M12 16v.01" />
        <path d="M16 12h1" />
        <path d="M21 12v.01" />
        <path d="M12 21v-1" />
      </svg>
    )
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton>
          <QRCodeIcon />
        </IconButton>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        {/*<Dialog.Title>Address as QRCode</Dialog.Title>*/}
        <Dialog.Description size="2" mb="4">
          Scan the QR Code to copy your Address or Share with someone
        </Dialog.Description>

        <Flex align={'center'} justify={'center'}>
          <Flex
            direction="column"
            align={"center"}
            justify={"center"}
            gap="3"
            style={{
              width: "240px",
              height: "240px",
              padding: "0px",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              border: "1px solid #eaeaea",
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">Loading...</div>
            ) : activeAccount ? (
              <QRCodeSVG className={'rounded-lg! p-4'} value={activeAccount.address} size={240} radius={8} />
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                No active account
              </div>
            )}
          </Flex>
        </Flex>

        <Card className="mt-6 rounded-lg p-6 shadow-lg">
          <h2 className="mb-4 text-sm font-medium">Instructions</h2>
          <ol className="list-decimal space-y-2 pl-4 text-sm">
            <li>Scan this QRCode to copy your address</li>
            <li>
              Send <Text color={"amber"}><Strong>{getBlockchainName()}</Strong></Text> to this
              address from another wallet or exchange
            </li>
            {getNetworkType() === "testnet" && (
              <>
                <li>
                  You are currently on {getNetworkType()}. Make sure you are the sending{" "}
                  {getBlockchainName()}
                </li>
                <li>
                  You can also get {getNetworkType()} faucets from the{" "}
                  <Link
                    href="/faucet"
                    rel="noopener noreferrer"
                    className="underline text-primary-400 hover:text-primary-500"
                  >
                    Faucet Page
                  </Link>
                </li>
              </>
            )}
          </ol>
        </Card>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
