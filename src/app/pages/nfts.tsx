import React, { useState, useEffect } from "react"
import {
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  ScrollArea,
  Section,
  Strong,
  Text
} from "@radix-ui/themes";
import {CopyIcon, LucideArrowRight, RefreshCwIcon} from "lucide-react";
import { E_NetworkType } from "~types/network";
import {shortenAddress} from "~utils";
import { useUIStore, useNetworkType } from "~store/ui-store";
import type {Address} from "viem";
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import CopyTextComponent from "~components/CopyToClipboard";
import { fetchNFTsForOwner } from "~services/nft";
import type { NFTBalance } from "~types/account";
import { NFTItemGrid } from "~components/nft/NFTItem";
import {Spinner} from "@radix-ui/themes/dist/esm";

export function NFTsPage() {
  const networkType = useNetworkType()
  const { selectedNetwork, refreshBalances } = useUIStore()
  const activeAccount = useUIStore(state => state.activeAccount);

  // NFT state
  const [nfts, setNfts] = useState<NFTBalance[]>([])
  const [nftsLoading, setNftsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentBlockchain = selectedNetwork.id

  // NFT Management
  const hasNfts = nfts && nfts.length > 0

  // Fetch NFTs on component mount and when dependencies change
  useEffect(() => {
    const fetchData = async () => {
      if (!activeAccount) return

      setIsLoading(true)
      setNftsLoading(true)

      try {
        // Fetch NFTs
        const userNfts = await fetchNFTsForOwner(activeAccount.address, selectedNetwork)
        setNfts(userNfts)
      } catch (error) {
        console.error("Error fetching NFTs:", error)
        setNfts([])
      } finally {
        setIsLoading(false)
        setNftsLoading(false)
      }
    }

    fetchData()
  }, [activeAccount, selectedNetwork])

  // Refresh NFT balances separately
  const refreshNFTs = async () => {
    if (!activeAccount) return

    setNftsLoading(true)
    try {
      const userNfts = await fetchNFTsForOwner(activeAccount.address, selectedNetwork)
      setNfts(userNfts)
    } catch (error) {
      console.error("Error refreshing NFTs:", error)
      setNfts([])
    } finally {
      setNftsLoading(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader>
        {/* Header */}
        <Flex align="center" justify="between" pr="2">
          <PageHeading>Your NFTs</PageHeading>
          {hasNfts && (
            <Text size="2" color="gray">{nfts.length} NFT{nfts.length !== 1 ? 's' : ''}</Text>
          )}
        </Flex>
      </PageHeader>
      <PageBody>
        {/* NFTs Display */}
        <Flex direction={"column"}>
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
              <Heading hidden size="2" color="gray" align="center">
                No NFTs Found
              </Heading>
              <Text size="2" color="gray" align="center" wrap={'balance'}>
                This account does not have any NFTs on the current network.
              </Text>
            </Flex>
          )}

          {!nftsLoading && hasNfts && (
            <Flex direction={'column'} gap={'2'}>
              {nfts.length > 0 ? (
                <ScrollArea type={'hover'}>
                  <Flex align={'center'} gap={'2'} wrap={'wrap'} className={''} px={'2'} pb={'4'}>
                    {
                      nfts.map((nft) => (
                        <NFTItemGrid key={`${nft.contractAddress}-${nft.tokenId}`} nft={nft}/>
                      ))
                    }
                  </Flex>
                </ScrollArea>
              ) : (
                <Flex direction="column" gap="2" align="center" py="4">
                  <Text size="2" color="gray">No NFTs match your search.</Text>
                </Flex>
              )}
            </Flex>
          )}
        </Flex>
      </PageBody>
    </PageContainer>
  )
}
