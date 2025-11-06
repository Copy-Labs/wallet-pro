import { AccountsTab } from "~components/wallet/accounts-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {Button, Callout, Flex, SegmentedControl, Strong, Text} from "@radix-ui/themes";
import {LucidePlus} from "lucide-react";
import { NavLink } from "react-router-dom";
import QRCode from "~components/QRCode/QRCode";
import { E_NetworkType, NetworkTypeList } from "~types/network";
import { capitalize, getEnhancedUiType } from "~utils";
import { useUIStore, useNetworkType } from "~store/ui-store";
import { getDefaultChainForType, getChainsByNetworkType } from "~utils/helper";
import {getPreferredNetworksPerType, getSelectedNetwork, savePreferredNetworkForType} from "~utils/storage";
import type { Chain } from "viem";
import React from "react";
import {PageBody, PageContainer, PageFooter, PageHeader, PageHeading} from "~components/PageContainer";
import {CreateAccountDialog} from "~components/CreateAccountDialog";
import {defaultChain, getChainById} from "~config/chains";
import {createSmartAccount, getAllAccounts} from "~services/wallet";
import {ImportAccountDialog} from "~components/ImportAccountDialog";

export function AccountsPage() {
  const networkType = useNetworkType()
  const { setNetworkType, setSelectedNetwork, refreshBalances } = useUIStore()
  const enhancedUiType = getEnhancedUiType()

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
      // First, try to find if the preferred chain is a custom network
      const customNetworks = useUIStore.getState().customNetworks
      const customNetwork = customNetworks.find(n => n.chainId === preferredChainId)

      if (customNetwork) {
        // Convert custom network to Chain format for the store
        const customNetworkAsChain = {
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
        setSelectedNetwork(customNetworkAsChain)
        refreshBalances()
        return
      }

      // Fallback: try to use the user's preferred network from predefined chains
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
    <PageContainer>
      {/*<div className="min-h-[600px] w-[375px] flex flex-col">*/}
      {/*<WalletHeader title="Wallet Pro" showLock={false} />*/}
      <PageHeader>
        <PageHeading>Your Accounts</PageHeading>
      </PageHeader>
      <PageBody>
        <Flex direction={"column"} height={"100%"} overflow={"auto"}>
          {/* Network Type Callout */}
          <Flex direction={"column"} width={"100%"} maxWidth={"100%"} px={'2'}>
            <Callout.Root size={"1"} color={networkType === E_NetworkType.MAINNET ? "amber" : "green"}>
              <Callout.Icon>
                <Text>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                       viewBox="0 0 256 256">
                    <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path>
                    <path
                      d="M144,176a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128ZM124,96a12,12,0,1,0-12-12A12,12,0,0,0,124,96Z"></path>
                  </svg>
                </Text>
              </Callout.Icon>
              <Callout.Text align={"center"}>
                You are on <Strong>{networkType}</Strong>
              </Callout.Text>
            </Callout.Root>
          </Flex>

          {/*<Flex align={"center"} justify={"between"} width={"100%"}>
            <Flex align={"center"} gap={"3"}>
              <Button asChild variant={"soft"}>
                <NavLink to={"/networks/new"}>
                  <LucidePlus size={16} strokeWidth={3}/>
                  <Text>Add Network</Text>
                </NavLink>
              </Button>
              <ProfileDropdown />
            </Flex>
          </Flex>*/}

          {/* Account Lists */}
          <div className="flex-1 h-full overflow-auto">
            <AccountsTab/>
          </div>
        </Flex>
      </PageBody>

      {/* Create Account Button */}
      <Flex align={'center'} justify={'center'} className="w-full h-16 px-4" gap={'3'}>
        <CreateAccountDialog
          triggerLabel={"Add New Address"}
          triggerChildren={<Button highContrast className={'flex-1'}>Add New Address</Button>}
        />
        {enhancedUiType.isTab ? (
          <ImportAccountDialog triggerLabel="Import Wallet" />
        ) : (
          <Button asChild variant="soft" color="grass" className="flex-1">
            <NavLink to="/accounts/import">Import Wallet</NavLink>
          </Button>
        )}
      </Flex>
      {/*<BottomNavigation/>*/}
      {/*</div>*/}
    </PageContainer>
  )
}
