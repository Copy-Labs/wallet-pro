import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import { Box, Callout, Flex, Heading, Section, Text } from "@radix-ui/themes"
import { E_NetworkType, NetworkTypeList } from "~types/network"
import { useUIStore, useNetworkType } from "~store/ui-store"
import React, { useState, useEffect } from "react"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer"
import { TokenList } from "~components/token/TokenList"
import type { TokenBalance } from "~types/account"
import { addCustomTokenForNetwork, validateCustomToken } from "~services/customTokens"
import { fetchAccountBalance } from "~services/balance"
import posthog from "posthog-js"
import type {Address} from "viem";

export function TokensPage() {
  const networkType = useNetworkType()
  const { selectedNetwork, refreshBalances } = useUIStore()
  const activeAccount = useUIStore(state => state.activeAccount)

  // Token state
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)

  // Add posthog events
  posthog.capture('walletpro tokens page', { property: 'Tokens page' })

  // Fetch token balances on component mount and when dependencies change
  useEffect(() => {
    const fetchTokens = async () => {
      if (!activeAccount) return

      setTokensLoading(true)
      try {
        const accountBalance = await fetchAccountBalance(activeAccount.address, selectedNetwork)
        setTokens(accountBalance.tokens)
      } catch (error) {
        console.error("Error fetching tokens:", error)
        setTokens([])
      } finally {
        setTokensLoading(false)
      }
    }

    fetchTokens()
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

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader>
        <PageHeading>Tokens</PageHeading>
      </PageHeader>
      <PageBody>
        <Flex direction={"column"}>
          {/* Token List Section */}
          <TokenList
            tokens={tokens}
            isLoading={tokensLoading}
            onRefresh={refreshTokenBalances}
            totalTokenValue={
              tokens.reduce((total, token) => {
                return total + (token.usdValue || 0)
              }, 0)
            }
            onAddCustomToken={handleAddCustomToken}
          />
        </Flex>
      </PageBody>
    </PageContainer>
  )
}
