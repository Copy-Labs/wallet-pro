import { Button, Card, Dialog, Flex, IconButton, Strong, Text } from "@radix-ui/themes"
import { QRCodeSVG } from "qrcode.react"
import { useUIStore } from "~/store/ui-store"
import { chainMetadata } from "~/config/chains"
import Link from "next/link"
import {Copy, LucideCopy, LucideX} from "lucide-react";
import React from "react";
import CopyTextComponent from "~components/CopyToClipboard";

export default function QRCode() {
  const { activeAccount, selectedNetwork } = useUIStore()

  // Helper function to get current network type
  const getNetworkType = () => {
    const metadata = chainMetadata[selectedNetwork.id]
    return metadata?.isTestnet ? "testnet" : "mainnet"
  }

  // Helper function to get blockchain name
  const getBlockchainName = () => {
    const metadata = chainMetadata[selectedNetwork.id]
    return metadata?.shortName || "Unknown"
  }

  const QRCodeIcon = () => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
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
        <IconButton variant={'soft'}>
          <QRCodeIcon />
        </IconButton>
      </Dialog.Trigger>

      <Dialog.Content className={'relative'} maxWidth="450px">
        {/*<Dialog.Title>Address as QRCode</Dialog.Title>*/}
        <Dialog.Description hidden align={'center'} size="2" mb="4">
          Scan the QR Code to copy your Address or Share with someone
          <Text color={'gray'} size={'1'} className="mb-2">Your {getBlockchainName()} Address</Text>
        </Dialog.Description>

        <Flex align={'center'} justify={'center'}>
          <Flex
            direction="column"
            align={"center"}
            justify={"center"}
            gap="3"
            style={{
              width: "220px",
              height: "220px",
              padding: "0px",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              border: "1px solid #eaeaea",
            }}
          >
            {activeAccount ? (
              <QRCodeSVG className={'rounded-lg! p-4'} value={activeAccount.address} size={220} radius={8} />
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                No active account
              </div>
            )}
          </Flex>
        </Flex>

        {/* Address Display */}
        <Card className={''} mt={'2'} variant={'ghost'}>
          <Flex direction={'column'}>
            <Text align={'center'} size={'1'} className="font-mono text-sm break-all" weight={'bold'}>
              {activeAccount?.address}
            </Text>
          </Flex>
        </Card>

        {/* Copy Button */}
        <Flex justify={'center'} mt={'2'}>
          <CopyTextComponent textToCopy={activeAccount?.address}>
            <Button
              className="w-auto mx-auto"
              size={'1'}
              variant="soft"
            >
              <Copy size={12} strokeWidth={3} />
              <Text>Copy Address</Text>
            </Button>
          </CopyTextComponent>
        </Flex>

        <Card variant={'ghost'} className="mt-2 rounded-lg p-5">
          <h2 className="mb-2 text-sm font-medium">Instructions</h2>
          <ol className="list-decimal space-y-2 pl-4 text-sm">
            <li>Scan this QRCode to copy your address</li>
            {getNetworkType() === "mainnet" && (
              <li>
                Send <Text color={"amber"}><Strong>{getBlockchainName()}</Strong></Text> to this
                address from another wallet or exchange
              </li>
            )}
            {getNetworkType() === "testnet" && (
              <>
                <li>
                  You are currently on {getNetworkType()}. Make sure you are only sending{" "}
                  <Text color={"jade"}><Strong>{getBlockchainName()}</Strong></Text>
                </li>
                {/*<li>
                  You can also get {getNetworkType()} faucets from the{" "}
                  <Link
                    href="/faucet"
                    rel="noopener noreferrer"
                    className="underline text-primary-400 hover:text-primary-500"
                  >
                    Faucet Page
                  </Link>
                </li>*/}
              </>
            )}
          </ol>
        </Card>

        <Flex className={'absolute top-2 right-2'} gap="3" justify="end">
          <Dialog.Close>
            <IconButton variant="solid" color="red" radius={'full'} size={'1'}>
              <LucideX size={14} strokeWidth={3} />
            </IconButton>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
