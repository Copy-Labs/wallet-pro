import React from "react"
import {Flex, Text, Badge, Box, Card} from "@radix-ui/themes"
import { toDecimalPlace } from "~utils"

interface TokenItemProps {
  token: {
    address: string
    symbol: string
    name: string
    balance: string
    decimals: number
    usdPrice?: number
    usdValue?: number
    priceChange24h?: number
  }
}

export function TokenItem({ token }: TokenItemProps) {
  const balance = parseFloat(token.balance)

  const formatPriceChange = (change?: number) => {
    if (!change) return null
    const sign = change > 0 ? '+' : ''
    const color = change > 0 ? 'green' : change < 0 ? 'red' : 'gray'
    return { value: `${sign}${change.toFixed(2)}%`, color }
  }

  const priceChange = formatPriceChange(token.priceChange24h)

  return (
    <Card variant={'classic'}>
      <Flex align="center" justify="between">
        {/* Token Info */}
        <Flex align="center" gap="3">
          {/* Token Icon Placeholder - could be enhanced with actual token icons */}
          <Flex
            align={'center'}
            height="8"
            justify="center"
            width="8"
          >
            <Text size="1" weight="bold" color="gray">
              {token.symbol.slice(0, 2).toUpperCase()}
            </Text>
          </Flex>

          <Box>
            <Flex align="center" gap="2">
              <Text size="3" weight="bold">
                {token.symbol.toUpperCase()}
              </Text>
              {priceChange && (
                <Badge size="1" color={priceChange.color as any}>
                  {priceChange.value}
                </Badge>
              )}
            </Flex>
            <Text size="2" color="gray">
              {token.name}
            </Text>
          </Box>
        </Flex>

        {/* Balance Info */}
        <Flex direction="column" align="end" gap="1">
          <Text size="3" weight="bold">
            {toDecimalPlace(balance, 4)} {token.symbol.toUpperCase()}
          </Text>

          {token.usdValue && token.usdValue > 0.01 ? (
            <Text size="2" color="gray">
              ≈ ${toDecimalPlace(token.usdValue, 2)}
            </Text>
          ) : (
            token.usdPrice && (
              <Text size="2" color="gray">
                ≈ ${toDecimalPlace(token.usdPrice, 2)}
              </Text>
            )
          )}
        </Flex>
      </Flex>
    </Card>
  )
}
