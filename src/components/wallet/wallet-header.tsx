import React from "react"
import { NetworkSelector } from "~components/network-selector"
import { hasSeedPhrase } from "~services/recovery"
import { lockWallet } from "~services/security"
import {Button, Flex, Heading, IconButton, SegmentedControl, Tooltip} from "@radix-ui/themes";
import QRCode from "~components/QRCode/QRCode";
import {E_NetworkType, NetworkTypeList} from "~types/network";
import {capitalize} from "~utils";
import {useNetworkType, useUIStore} from "~store/ui-store";
import {getPreferredNetworksPerType, savePreferredNetworkForType} from "~utils/storage";
import {getChainsByNetworkType, getDefaultChainForType} from "~utils/helper";
import type {Chain} from "viem";
import {Plus} from "lucide-react";

interface WalletHeaderProps {
  title: string
  showLock?: boolean
}

export function WalletHeader({ title, showLock }: WalletHeaderProps) {
  const [hasBackup, setHasBackup] = React.useState(false)
  const networkType = useNetworkType()
  const { setNetworkType, setSelectedNetwork, refreshBalances } = useUIStore()

  React.useEffect(() => {
    const checkBackup = async () => {
      try {
        const backup = await hasSeedPhrase()
        setHasBackup(backup)
      } catch (error) {
        console.error("Error checking backup status:", error)
      }
    }
    checkBackup()
  }, [])

  const handleLock = async () => {
    try {
      await lockWallet()
      window.location.href = '/tabs/unlock.html'
    } catch (error) {
      console.error('Failed to lock wallet:', error)
    }
  }

  const handleNetworkTypeChange = async (value: string) => {
    const newType = value as E_NetworkType
    const previousType = networkType

    // Save the current network preference for the previous type
    if (previousType) {
      const currentNetwork = useUIStore.getState().selectedNetwork
      await savePreferredNetworkForType(previousType, currentNetwork.id)
    }

    setNetworkType(newType)

    // Load preferred network for the new type, or use default
    const preferredNetworks = await getPreferredNetworksPerType()
    const preferredChainId = preferredNetworks[newType]

    if (preferredChainId) {
      // Try to use the user's preferred network for this type
      const availableChains = getChainsByNetworkType(newType)
      const preferredChain = availableChains.find(chain => chain.id === preferredChainId)
      if (preferredChain) {
        setSelectedNetwork(preferredChain)
        refreshBalances()
        return
      }
    }

    // Fallback to default chain for the selected network type
    const defaultChain = getDefaultChainForType(newType) as Chain
    if (defaultChain) {
      setSelectedNetwork(defaultChain)
      refreshBalances()
    }
  }

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-gray12">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/*<Heading size={'2'} truncate>{title}</Heading>*/}

        <div className="">
          <SegmentedControl.Root
            defaultValue={networkType}
            value={networkType}
            size="1"
            onValueChange={handleNetworkTypeChange}
          >
            {NetworkTypeList.map((eachNetworkType) => (
              <SegmentedControl.Item key={eachNetworkType} value={eachNetworkType}>
                {capitalize(eachNetworkType)}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </div>
      </div>

      <Flex align={'center'} direction={'row'} gap={'1'}>
        <NetworkSelector />
        {!hasBackup && (
          <div className="flex items-center gap-1 text-amber-600 text-xs">
            <span>⚠️</span>
            <span className="hidden sm:inline">No backup</span>
          </div>
        )}

        <Tooltip content={"Add Network"}>
          <IconButton variant={'soft'}><Plus size={16} strokeWidth={3} /></IconButton>
        </Tooltip>

        {showLock && (
          <IconButton
            size="2"
            variant="soft"
            onClick={handleLock}
            title="Lock Wallet"
          >
            {/*<Lock className="h-4 w-4" />*/}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"></path><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"></path></svg>
          </IconButton>
        )}
      </Flex>
    </header>
  )
}
