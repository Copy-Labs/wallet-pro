import React, { useState, useMemo } from "react"
import {Box, Button, Flex, Heading, Section, Spinner, Text, TextField, Badge, SegmentedControl} from "@radix-ui/themes"
import { RefreshCwIcon, SearchIcon, PlusIcon } from "lucide-react"
import { TokenItem } from "./TokenItem"
import { AddCustomTokenModal } from "./AddCustomTokenModal"

interface TokenListProps {
  tokens: Array<{
    address: string
    symbol: string
    name: string
    balance: string
    decimals: number
    usdPrice?: number
    usdValue?: number
    priceChange24h?: number
  }>
  isLoading?: boolean
  onRefresh?: () => void
  totalTokenValue?: number
  onAddCustomToken?: (token: { address: string; symbol: string; decimals: number; name?: string }) => void
}

export function TokenList({ tokens, isLoading, onRefresh, totalTokenValue, onAddCustomToken }: TokenListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'value' | 'name' | 'symbol'>('value')
  const [hideZeroBalance, setHideZeroBalance] = useState(false)
  const [showAddTokenModal, setShowAddTokenModal] = useState(false)

  const hasTokens = tokens && tokens.length > 0

  // Filter and sort tokens based on user preferences
  const filteredSortedTokens = useMemo(() => {
    if (!hasTokens) return []

    let filtered = tokens.filter(token => {
      const balance = parseFloat(token.balance)
      const matchesSearch = searchQuery.trim() === '' ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesBalance = !hideZeroBalance || balance > 0

      return matchesSearch && matchesBalance
    })

    // Sort tokens
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'symbol':
          return a.symbol.localeCompare(b.symbol)
        case 'value':
        default:
          const valueA = a.usdValue || 0
          const valueB = b.usdValue || 0
          return valueB - valueA // Higher value first
      }
    })

    return filtered
  }, [tokens, searchQuery, sortBy, hideZeroBalance, hasTokens])

  if (isLoading) {
    return (
      <Section size="2" width="100%" maxWidth="100%">
        <Flex direction="column" gap="3" align="center" p="4">
          <Spinner size="2" />
          <Text size="2" color="gray">Loading tokens...</Text>
        </Flex>
      </Section>
    )
  }

  return (
    <Section size="1" width="100%" maxWidth="100%" px={'2'}>
      {/* Header */}
      <Flex align="center" justify="between" mb="3" px="2">
        <Box>
          <Heading size="4">Tokens</Heading>
          {hasTokens && (
            <Text size="2" color="gray">Total: ${totalTokenValue.toFixed(2)}</Text>
          )}
        </Box>

        <Flex gap="1">
          {onAddCustomToken && (
            <Button
              size="1"
              variant="soft"
              onClick={() => setShowAddTokenModal(true)}
            >
              <PlusIcon size={14} />
            </Button>
          )}

          {onRefresh && (
            <Button
              size="1"
              variant="soft"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCwIcon size={14} />
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Search and Filter Controls */}
      {hasTokens && (
        <Flex direction="column" gap="3" px="2" mb="3">
          {/* Search */}
          <TextField.Root
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="2"
          >
            <TextField.Slot>
              <SearchIcon size={16} />
            </TextField.Slot>
          </TextField.Root>

          {/* Sort and Filter Controls */}
          <Flex gap="3" align="center">
            <Flex wrap={'wrap'} align={'center'} gap={'2'}>
              <Text size="2" color="gray" mb="1">Sort by:</Text>
              <SegmentedControl.Root size={'1'} value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SegmentedControl.Item value="value">Value</SegmentedControl.Item>
                <SegmentedControl.Item value="name">Name</SegmentedControl.Item>
                <SegmentedControl.Item value="symbol">Symbol</SegmentedControl.Item>
              </SegmentedControl.Root>
            </Flex>

            <Button
              size="1"
              variant={hideZeroBalance ? "solid" : "soft"}
              onClick={() => setHideZeroBalance(!hideZeroBalance)}
            >
              {hideZeroBalance ? 'Show All' : 'Hide Zero'}
            </Button>
          </Flex>
        </Flex>
      )}

      {/* Empty State */}
      {!hasTokens && (
        <Flex direction="column" gap="3" align="center" p="4">
          <Heading size="4" color="gray" align="center">
            No Tokens Found
          </Heading>
          <Text size="2" color="gray" align="center">
            This wallet doesn't have any tokens with balance on the current network.
          </Text>
          {onAddCustomToken && (
            <Button variant={'soft'} onClick={() => setShowAddTokenModal(true)}>
              <PlusIcon size={16} strokeWidth={4} />
              Add Custom Token
            </Button>
          )}
        </Flex>
      )}

      {/* Filtered Token List */}
      {hasTokens && (
        <Flex direction={'column'} gap={'2'}>
          {filteredSortedTokens.length > 0 ? (
            filteredSortedTokens.map((token) => (
              <TokenItem key={token.address} token={token} />
            ))
          ) : (
            <Flex direction="column" gap="2" align="center" py="4">
              <Text size="2" color="gray">No tokens match your search.</Text>
              {onAddCustomToken && (
                <Button size="1" variant="soft" onClick={() => setShowAddTokenModal(true)}>
                  <PlusIcon size={14} strokeWidth={4} />
                  Add Custom Token
                </Button>
              )}
            </Flex>
          )}
        </Flex>
      )}

      {/* Add Custom Token Modal */}
      <AddCustomTokenModal
        isOpen={showAddTokenModal}
        onOpenChange={setShowAddTokenModal}
        onAddToken={(tokenData) => {
          if (onAddCustomToken) {
            onAddCustomToken(tokenData)
            setShowAddTokenModal(false)
          }
        }}
      />
    </Section>
  )
}
