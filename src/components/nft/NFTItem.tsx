import React from "react"
import { Card, Text, Box, Flex, Badge } from "@radix-ui/themes"
import type { NFTBalance } from "~/types/account"

interface NFTItemProps {
  nft: NFTBalance
}

export function NFTItem({ nft }: NFTItemProps) {
  return (
    <Card variant="classic" className="min-w-48">
      <Flex direction="column" gap="2">
        {/* NFT Image */}
        <Box className="aspect-square rounded-lg overflow-hidden bg-gray-100">
          {nft.image ? (
            <img
              src={nft.image}
              alt={nft.name || `NFT #${nft.tokenId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder on error
                e.currentTarget.src = "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?&w=256&h=256&q=70&crop=focalpoint&fp-x=0.5&fp-y=0.3&fp-z=1&fit=crop"
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Text size="2" color="gray">No Image</Text>
            </div>
          )}
        </Box>

        {/* NFT Info */}
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold" className="truncate">
            {nft.name || `NFT #${nft.tokenId}`}
          </Text>

          <Text size="1" color="gray" className="truncate">
            {nft.collection?.name || 'Unknown Collection'}
          </Text>

          {/* Token Type Badge */}
          {nft.tokenType && (
            <Badge size="1" color="blue" variant="soft">
              {nft.tokenType}
            </Badge>
          )}

          {/* Balance for ERC1155 */}
          {nft.balance && nft.balance !== "1" && (
            <Text size="1" color="gray">
              Balance: {nft.balance}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}

export function NFTItemGrid({ nft }: NFTItemProps) {
  return (
    <Card className="min-w-60" size="1" variant="classic">
      <Flex direction="column" gap="2">
        {/* NFT Image */}
        <Box className="aspect-square rounded-lg overflow-hidden bg-gray-100">
          {nft.image ? (
            <img
              src={nft.image}
              alt={nft.name || `NFT #${nft.tokenId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder on error
                e.currentTarget.src = "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?&w=256&h=256&q=70&crop=focalpoint&fp-x=0.5&fp-y=0.3&fp-z=1&fit=crop"
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Text size="2" color="gray">No Image</Text>
            </div>
          )}
        </Box>

        {/* NFT Info */}
        <Flex direction="column" gap="1">
          <Text size="2" weight="bold" className="truncate">
            {nft.name || `NFT #${nft.tokenId}`}
          </Text>

          <Text size="1" color="gray" className="truncate">
            {nft.collection?.name || 'Unknown Collection'}
          </Text>

          {/* Token Type Badge */}
          {nft.tokenType && (
            <Badge size="1" color="blue" variant="soft">
              {nft.tokenType}
            </Badge>
          )}

          {/* Balance for ERC1155 */}
          {nft.balance && nft.balance !== "1" && (
            <Text size="1" color="gray">
              Balance: {nft.balance}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}
