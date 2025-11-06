import React from "react"
import {Flex, Text, Badge, Box, Card, Avatar, Button} from "@radix-ui/themes"
import { toDecimalPlace } from "~utils"
import { ArrowUpDownIcon } from "lucide-react"

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
  onSwap?: (token: TokenItemProps['token']) => void
}

export function TokenItem({ token, onSwap }: TokenItemProps) {
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
          <Avatar
            color={'gray'}
            radius={'full'}
            size={'2'}
            src="https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?&w=256&h=256&q=70&crop=focalpoint&fp-x=0.5&fp-y=0.3&fp-z=1&fit=crop"
            fallback={token.symbol.slice(0, 2).toUpperCase()}
          />

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

        {/* Balance Info & Actions */}
        <Flex direction="column" align="end" gap="1">
          <Text size="3" weight="bold">
            {toDecimalPlace(balance, 4)} {token.symbol.toUpperCase()}
          </Text>

          <Flex align="center" gap="2">
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

            {onSwap && balance > 0 && (
              <Button
                size="1"
                variant="soft"
                onClick={(e) => {
                  e.stopPropagation()
                  onSwap(token)
                }}
              >
                <ArrowUpDownIcon size={12} />
              </Button>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}

export function TokenItemGrid({ token, onSwap }: TokenItemProps) {
  const balance = parseFloat(token.balance)

  const formatPriceChange = (change?: number) => {
    if (!change) return null
    const sign = change > 0 ? '+' : ''
    const color = change > 0 ? 'green' : change < 0 ? 'red' : 'gray'
    return { value: `${sign}${change.toFixed(2)}%`, color }
  }

  const priceChange = formatPriceChange(token.priceChange24h)

  return (
    <Card className={'min-w-60'} size={'1'} variant={'classic'}>
      <Flex align="center" justify="between">
        {/* Token Info */}
        <Flex direction={'column'} align="start" justify={'center'} gap="0">
          {/* Token Icon Placeholder - could be enhanced with actual token icons */}
          <Flex
            align={'center'}
            gap={'2'}
            justify="center"
          >
            <Avatar
              color={'gray'}
              radius={'full'}
              size={'2'}
              src="https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?&w=256&h=256&q=70&crop=focalpoint&fp-x=0.5&fp-y=0.3&fp-z=1&fit=crop"
              fallback={token.symbol.slice(0, 2).toUpperCase()}
            />
            <Flex align="center" gap="2">
              <Text size="2" weight="bold">
                {token.symbol.toUpperCase()}
              </Text>
              {priceChange && (
                <Badge size="1" color={priceChange.color as any}>
                  {priceChange.value}
                </Badge>
              )}
            </Flex>
          </Flex>

          <Box>
            <Text size="2" color="gray">
              {token.name}
            </Text>
          </Box>
        </Flex>

        {/* Balance Info */}
        <Flex direction="column" align="end" gap="1">
          <Text size="2" weight="bold">
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
