import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {
  Box,
  Button,
  Callout, Card,
  Flex,
  Heading,
  ScrollArea,
  Section,
  Strong,
  Text
} from "@radix-ui/themes";
import {CopyIcon, LucideArrowRight, PlusIcon} from "lucide-react";
import { E_NetworkType } from "~types/network";
import {shortenAddress, toDecimalPlace, fetchEthPrice} from "~utils";
import { useUIStore, useNetworkType } from "~store/ui-store";
import { getDefaultChainForType, getChainsByNetworkType } from "~utils/helper";
import { getPreferredNetworksPerType, savePreferredNetworkForType } from "~utils/storage";
import type {Address, Chain} from "viem";
import React, { useState, useEffect } from "react";
import {PageBody, PageContainer} from "~components/PageContainer";
import CopyTextComponent from "~components/CopyToClipboard";
import { fetchAccountBalance } from "~services/balance";
import {blockchainSymbolMapping} from "~config/constant";
import type { TokenBalance, NFTBalance } from "~types/account";
import { addCustomTokenForNetwork, validateCustomToken } from "~services/customTokens";
import posthog from "posthog-js";
import {TokenItemGrid} from "~components/token/TokenItem";
import {Link, useNavigate} from "react-router-dom";
import {Spinner} from "@radix-ui/themes/dist/esm";
import {AddCustomTokenModal} from "~components/token/AddCustomTokenModal";
import { fetchNFTsForOwner } from "~services/nft";
import { NFTItemGrid } from "~components/nft/NFTItem";

export function HomePage() {
  const networkType = useNetworkType()
  const navigate = useNavigate()
  const { selectedNetwork, setNetworkType, setSelectedNetwork, refreshBalances } = useUIStore()
  const activeAccount = useUIStore(state => state.activeAccount);

  // Balance and price state
  const [currentBalance, setCurrentBalance] = useState<string>("0")
  const [ethPrice, setEthPrice] = useState<number>(0)
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [nfts, setNfts] = useState<NFTBalance[]>([])
  const [nftsLoading, setNftsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentBlockchain = selectedNetwork.id

  // Token Management
  const hasTokens = tokens && tokens.length > 0
  const totalTokenValue = tokens.reduce((total, token) => {
    return total + (token.usdValue || 0)
  }, 0)

  // NFT Management
  const hasNfts = nfts && nfts.length > 0

  // Add posthog events
  posthog.capture('walletpro home page', { property: 'Home page' })

  // Fetch balance and price on component mount and when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      if (!activeAccount) return

      setIsLoading(true)
      setTokensLoading(true)
      setNftsLoading(true)

      try {
        // Fetch complete account balance (ETH + tokens with prices)
        const accountBalance = await fetchAccountBalance(activeAccount.address, selectedNetwork)
        setCurrentBalance(accountBalance.eth)
        setTokens(accountBalance.tokens)

        // Fetch NFTs
        const userNfts = await fetchNFTsForOwner(activeAccount.address, selectedNetwork)
        setNfts(userNfts)

        // Fetch ETH price
        const price = await fetchEthPrice()
        setEthPrice(price || 0)
      } catch (error) {
        console.error("Error fetching balance:", error)
        setCurrentBalance("0")
        setEthPrice(0)
        setTokens([])
        setNfts([])
      } finally {
        setIsLoading(false)
        setTokensLoading(false)
        setNftsLoading(false)
      }
    }

    fetchData()
  }, [activeAccount, selectedNetwork])

  // Refresh token balances separately
  const refreshTokenBalances = async () => {
    if (!activeAccount) return

    setTokensLoading(true)
    try {
      const accountBalance = await fetchAccountBalance(activeAccount.address, selectedNetwork)
      setTokens(accountBalance.tokens)
    } catch (error) {
      console.error("Error refreshing tokens:", error)
      setTokens([])
    } finally {
      setTokensLoading(false)
    }
  }

  // Handle adding custom tokens
  const handleAddCustomToken = async (tokenData: { address: Address; symbol: string; decimals: number; name?: string }) => {
    const validationError = validateCustomToken(tokenData)
    if (validationError) {
      console.error("Validation error:", validationError)
      // You might want to show this error to the user
      return
    }

    try {
      await addCustomTokenForNetwork(selectedNetwork.id, tokenData)
      // After adding, refresh the token list to include the new token
      refreshTokenBalances()
    } catch (error) {
      console.error("Failed to add custom token:", error)
      // You might want to show this error to the user
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
      <WalletHeader title="Wallet Pro"/>
      <PageBody>
        <Flex direction={"column"} width={"100%"} maxWidth={"100%"} pl={'4'} pt={'4'}>
          <Card asChild variant={'ghost'}>
            <Callout.Root className={'flex flex-row items-center w-full'} size={"1"} color={networkType === E_NetworkType.MAINNET ? "amber" : "green"} role={"alert"}>
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
              <Callout.Text align={"left"} className={'w-full'}>
                {/*You are on <Strong>{selectedNetwork.name}</Strong>*/}
                <Flex align={'center'} justify={'between'} position={'relative'} width={'100%'} gap={'2'}>
                  <Text>Only <Strong>Testnet</Strong> is supported</Text>
                  <Button variant={'soft'} onClick={() => navigate('/settings/about')}>Learn More</Button>
                </Flex>
              </Callout.Text>
            </Callout.Root>
          </Card>
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
                  <CopyTextComponent textToCopy={activeAccount?.address as string}>
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

            {/* Tokens Display */}
            <Section size="2" width="100%" maxWidth="100%" px={'2'}>
              {/* Header */}
              <Flex align="center" justify="between" mb="3" px="2">
                <Box>
                  <Heading size="2">Tokens</Heading>
                  {/*{hasTokens && (
                    <Text size="2" color="gray">Total: ${totalTokenValue.toFixed(2)}</Text>
                  )}*/}
                </Box>

                <Link to={'/tokens'}>
                  <Button size={'1'} variant={'ghost'}>
                    Show More
                    <LucideArrowRight size={12} strokeWidth={3} />
                  </Button>
                </Link>
              </Flex>

              {/* Tokens Loading */}
              {
                tokensLoading && (
                  <Flex direction="column" gap="3" align="center" p="4">
                    <Spinner size="2" />
                    <Text size="2" color="gray">Loading tokens...</Text>
                  </Flex>
                )
              }

              {/* Tokens Empty */}
              {!tokensLoading && !hasTokens && (
                <Flex direction="column" gap="3" align="center" p="4">
                  <Heading hidden size="2" color="gray" align="center">
                    No Tokens Found
                  </Heading>
                  <Text size="2" color="gray" align="center" wrap={'balance'}>
                    This account does not have any tokens on the current network.
                  </Text>
                  <AddCustomTokenModal
                    onAddToken={handleAddCustomToken}
                    triggerChildren={
                      <Button size={'1'} variant={'soft'}>
                        <PlusIcon size={12} strokeWidth={4} />
                        Add Custom Token
                      </Button>
                    }
                  />
                </Flex>
              )}

              {!tokensLoading && hasTokens && (
                <Flex direction={'column'} gap={'2'}>
                  {tokens.length > 0 ? (
                    <ScrollArea type={'hover'}>
                      <Flex align={'center'} gap={'2'} wrap={'nowrap'} className={''} px={'2'} pb={'4'}>
                        {
                          tokens.map((token) => (
                            <TokenItemGrid key={token.address} token={token}/>
                          ))
                        }
                      </Flex>
                    </ScrollArea>
                  ) : (
                    <Flex direction="column" gap="2" align="center" py="4">
                      <Text size="2" color="gray">No tokens match your search.</Text>
                      {/*{onAddCustomToken && (
                        <Button size="1" variant="soft" onClick={() => setShowAddTokenModal(true)}>
                          <PlusIcon size={14} strokeWidth={4} />
                          Add Custom Token
                        </Button>
                      )}*/}
                    </Flex>
                  )}
                </Flex>
              )}
            </Section>

            {/* NFTs Display */}
            <Section hidden size="1" width="100%" maxWidth="100%" px={'2'}>
              {/* Header */}
              <Flex align="center" justify="between" mb="3" px="2">
                <Box>
                  <Heading size="2">NFTs</Heading>
                </Box>

                <Link to={'/nfts'}>
                  <Button size={'1'} variant={'ghost'}>
                    Show More
                    <LucideArrowRight size={12} strokeWidth={3} />
                  </Button>
                </Link>
              </Flex>

              {/* NFTs Loading */}
              {
                nftsLoading && (
                  <Flex direction="column" gap="3" align="center" p="4">
                    <Spinner size="2" />
                    <Text size="2" color="gray">Loading NFTs...</Text>
                  </Flex>
                )
              }

              {/* NFTs Empty */}
              {!nftsLoading && !hasNfts && (
                <Flex direction="column" gap="3" align="center" p="4">
                  <Text size="2" color="gray" align="center" wrap={'balance'}>
                    This account does not have any NFTs on the current network.
                  </Text>
                </Flex>
              )}

              {!nftsLoading && hasNfts && (
                <Flex direction={'column'} gap={'2'}>
                  {nfts.length > 0 ? (
                    <ScrollArea type={'hover'}>
                      <Flex align={'center'} gap={'2'} wrap={'nowrap'} className={''} px={'2'} pb={'4'}>
                        {
                          nfts.map((nft) => (
                            <NFTItemGrid key={`${nft.contractAddress}-${nft.tokenId}`} nft={nft}/>
                          ))
                        }
                      </Flex>
                    </ScrollArea>
                  ) : (
                    <Flex direction="column" gap="2" align="center" py="4">
                      <Text size="2" color="gray">No NFTs found.</Text>
                    </Flex>
                  )}
                </Flex>
              )}
            </Section>

            {/* Token List Section */}
            {/*<TokenList
              tokens={tokens}
              isLoading={tokensLoading}
              onRefresh={refreshTokenBalances}
              totalTokenValue={
                tokens.reduce((total, token) => {
                  return total + (token.usdValue || 0)
                }, 0)
              }
              onAddCustomToken={handleAddCustomToken}
            />*/}

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
