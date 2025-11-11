import React, { useState, useMemo } from "react"
import { Dialog, Flex, Text, TextField, Card, Avatar, Button, ScrollArea } from "@radix-ui/themes"
import { SearchIcon, XIcon } from "lucide-react"
import type { Address } from "viem"

interface Token {
  address: Address
  symbol: string
  name: string
  decimals: number
  balance: string
  usdPrice?: number
  usdValue?: number
}

interface TokenSelectorProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  tokens: Token[]
  selectedToken?: Token | null
  onSelectToken: (token: Token) => void
  title?: string
}

export function TokenSelector({
  isOpen,
  onOpenChange,
  tokens,
  selectedToken,
  onSelectToken,
  title = "Select Token"
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens

    const query = searchQuery.toLowerCase()
    return tokens.filter(token =>
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    )
  }, [tokens, searchQuery])

  const handleSelectToken = (token: Token) => {
    onSelectToken(token)
    onOpenChange(false)
    setSearchQuery("")
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 400 }}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>
          Choose a token to continue with your swap.
        </Dialog.Description>

        {/* Search */}
        <Flex direction="column" gap="3" mt="4">
          <TextField.Root
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          >
            <TextField.Slot>
              <SearchIcon size={16} />
            </TextField.Slot>
          </TextField.Root>

          {/* Token List */}
          <ScrollArea style={{ height: 300 }}>
            <Flex direction="column" gap="2">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <Card
                    key={token.address}
                    variant="ghost"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectToken(token)}
                  >
                    <Flex align="center" justify="between" p="2">
                      <Flex align="center" gap="3">
                        <Avatar
                          color="gray"
                          radius="full"
                          size="2"
                          fallback={token.symbol.slice(0, 2).toUpperCase()}
                        />
                        <Flex direction="column">
                          <Text size="3" weight="bold">
                            {token.symbol.toUpperCase()}
                          </Text>
                          <Text size="2" color="gray">
                            {token.name}
                          </Text>
                        </Flex>
                      </Flex>

                      <Flex direction="column" align="end">
                        <Text size="2" weight="medium">
                          {parseFloat(token.balance) > 0
                            ? `${parseFloat(token.balance).toFixed(4)} ${token.symbol.toUpperCase()}`
                            : "0"
                          }
                        </Text>
                        {token.usdValue && token.usdValue > 0 && (
                          <Text size="1" color="gray">
                            ≈ ${token.usdValue.toFixed(2)}
                          </Text>
                        )}
                      </Flex>
                    </Flex>
                  </Card>
                ))
              ) : (
                <Flex direction="column" align="center" py="4">
                  <Text size="2" color="gray">
                    No tokens found matching "{searchQuery}"
                  </Text>
                </Flex>
              )}
            </Flex>
          </ScrollArea>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft">Cancel</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
