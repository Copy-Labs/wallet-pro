import { AccountsTab } from "~components/wallet/accounts-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {Box, Button, Callout, Flex, Heading, Section, SegmentedControl, Strong, Text} from "@radix-ui/themes";
import {CopyIcon, LucidePlus} from "lucide-react";
import { NavLink } from "react-router-dom";
import QRCode from "~components/QRCode/QRCode";
import { E_NetworkType, NetworkTypeList } from "~types/network";
import {capitalize, shortenAddress, toDecimalPlace, fetchEthPrice} from "~utils";
import { useUIStore, useNetworkType } from "~store/ui-store";
import { getDefaultChainForType, getChainsByNetworkType } from "~utils/helper";
import { getPreferredNetworksPerType, savePreferredNetworkForType } from "~utils/storage";
import type { Chain } from "viem";
import React, { useState, useEffect } from "react";
import {PageBody, PageContainer, PageHeader} from "~components/PageContainer";
import CopyTextComponent from "~components/CopyToClipboard";
import { fetchEthBalance } from "~services/balance";
import {blockchainSymbolMapping} from "~config/constant";

export function HomePage() {
  const networkType = useNetworkType()
  const { selectedNetwork, setNetworkType, setSelectedNetwork, refreshBalances } = useUIStore()
  const activeAccount = useUIStore(state => state.activeAccount);

  // Balance and price state
  const [currentBalance, setCurrentBalance] = useState<string>("0")
  const [ethPrice, setEthPrice] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  const currentBlockchain = selectedNetwork.id

  // Fetch balance and price on component mount and when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      if (!activeAccount) return

      setIsLoading(true)
      try {
        // Fetch ETH balance
        const balance = await fetchEthBalance(activeAccount.address, selectedNetwork)
        setCurrentBalance(balance)

        // Fetch ETH price (only if on Ethereum-based networks)
        const price = await fetchEthPrice()
        setEthPrice(price || 0)
      } catch (error) {
        console.error("Error fetching balance:", error)
        setCurrentBalance("0")
        setEthPrice(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeAccount, selectedNetwork])

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
    <PageContainer>
      {/*<div className="min-h-[600px] w-[375px] flex flex-col">*/}
      <WalletHeader title="Wallet Pro"/>
      <PageBody>
        <Flex direction={"column"} width={"100%"} maxWidth={"100%"} p={'2'}>
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
        {/*<Flex align={"center"} justify={"between"} width={"100%"}>*/}
        {/*  <Flex align={"center"} gap={"3"}>*/}
        {/*    <Button asChild variant={"soft"}>*/}
        {/*      <NavLink to={"/networks/new"}>*/}
        {/*        <LucidePlus size={16} strokeWidth={3}/>*/}
        {/*        <Text>Add Network</Text>*/}
        {/*      </NavLink>*/}
        {/*    </Button>*/}
        {/*    /!*<ProfileDropdown />*!/*/}
        {/*  </Flex>*/}
        {/*</Flex>*/}
        <div className="flex-1 overflow-auto">
          <Section size={"1"} width={"100%"} maxWidth={"100%"}>
            <Flex direction={"column"}>
              <Text as={"div"} wrap={"wrap"} align={"center"}>
                <Text align={"left"} size={"2"} weight={"bold"}>
                  {activeAccount?.name}
                </Text>
                <Box className="">
                  <CopyTextComponent textToCopy={activeAccount?.name as string}>
                    <Button size={'3'} variant="soft" radius="full">
                      <Flex
                        position={"relative"}
                        direction={"row"}
                        justify={"center"}
                        align={"center"}
                        gap={"2"}
                        py={"1"}
                      >
                        <Text as="div" size={"5"} weight={"bold"}>
                          {shortenAddress(activeAccount?.address)}
                        </Text>
                        <CopyIcon size={14} fontSize={"6"} />
                      </Flex>
                    </Button>
                  </CopyTextComponent>
                </Box>
              </Text>
              <Section size={"2"}>
                <Flex direction={"column"} align={"center"} gap={"5"}>
                  <Heading size={"9"} align={"center"}>
                    {toDecimalPlace(Number(currentBalance), 4)}{" "}
                    <Text size={"8"} color={"gray"}>
                      {blockchainSymbolMapping[currentBlockchain]?.toLocaleUpperCase()}
                    </Text>
                    {/* Display the Dollar equivalent here in amber color */}
                    <Text
                      as={"div"}
                      weight={"regular"}
                      size={"4"}
                      align={"center"}
                      color={"gray"}
                      style={{ opacity: "0.8" }}
                    >
                      ≈{" "}
                      <Text size={"5"} color={"gray"}>
                        $
                      </Text>
                      {toDecimalPlace(ethPrice * Number(currentBalance), 4)}
                    </Text>
                  </Heading>

                  <Button size={'1'} variant="soft" onClick={refreshBalances}>
                    Refresh Balance
                  </Button>
                </Flex>
              </Section>
            </Flex>

            {/*<Flex>
                <Box>
                  <Button variant={"soft"} radius={"large"} style={{ height: "48px", borderRadius: "16px" }}>
                    <Link href={`/token/${account}`}>
                      <LucideArrowUp />
                    </Link>
                  </Button>
                </Box>
                <Box>
                  <Button>
                    <LucideArrowDown />
                  </Button>
                </Box>
              </Flex>*/}
          </Section>
        </div>
      </PageBody>
      <BottomNavigation/>
      {/*</div>*/}
    </PageContainer>
  )
}
