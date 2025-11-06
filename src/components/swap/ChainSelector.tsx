import React, { useState, useMemo } from "react"
import { Dialog, Flex, Text, TextField, Card, Avatar, Button, ScrollArea } from "@radix-ui/themes"
import { SearchIcon } from "lucide-react"
import { getChainById } from "~config/chains"

interface Chain {
  id: number
  name: string
  nativeCurrency: {
    symbol: string
  }
}

interface ChainSelectorProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedChain?: Chain | null
  onSelectChain: (chain: Chain) => void
  title?: string
  excludeChainId?: number // Chain to exclude from selection
}

// Supported cross-chain swap networks (from Alchemy docs)
const CROSS_CHAIN_SUPPORTED_CHAIN_IDS = [
  1,      // Ethereum
  10,     // Optimism
  56,     // BSC/BNB
  100,    // Gnosis (formerly xDai)
  137,    // Polygon
  250,    // Fantom
  8453,   // Base
  42161,  // Arbitrum One
  42170,  // Arbitrum Nova
  43114,  // Avalanche C-Chain
  59144,  // Linea
  81457,  // Blast
  534352, // Scroll
  7777777, // Zora
  34443,  // Mode
  480,    // World Chain
  660279, // Xai
  167000, // Taiko
  169,    // Manta Pacific
  1101,   // Polygon zkEVM
  5000,   // Mantle
  252,    // Frax
  2525,   // Frax Testnet
  1088,   // Metis
  1284,   // Moonbeam
  1285,   // Moonriver
  2001,   // Milkomeda C1
  42220,  // Celo
  1313161554, // Aurora
  25,     // Cronos
  288,    // Boba Network
  106,    // Velas
  57,     // Syscoin
  61,     // Ethereum Classic
  40,     // Telos
  32659,  // Fusion
  82,     // Meter
  50,     // XDC
  14,     // Flare
  19,     // Songbird
  122,    // Fuse
  336,    // Shiden
  592,    // Astar
  1024,   // CLV
  1111,   // WEMIX3.0
  9001,   // Evmos
  53935,  // DFK
  8217,   // Klaytn
  888,    // Wanchain
  55,     // Zyx
  70,     // Hoo
  32520,  // Bitgert
  1818,   // Cube
  1231,   // Ultron
  1230,   // Ultron Testnet
  1112,   // WEMIX3.0 Testnet
  97,     // BSC Testnet
  44787,  // Celo Alfajores
  80001,  // Polygon Mumbai
  4002,   // Fantom Testnet
  43113,  // Avalanche Fuji
  5,      // Goerli
  11155111, // Sepolia
  420,    // Optimism Goerli
  421613, // Arbitrum Goerli
  42170,  // Arbitrum Nova
  84531,  // Base Goerli
  84532,  // Base Sepolia
  59140,  // Linea Goerli
  59141,  // Linea Sepolia
  534351, // Scroll Sepolia
  7777777, // Zora
  999,    // Zora Goerli
  919,    // Mode Testnet
  4801,   // World Chain Sepolia
  637,    // Xai Testnet
  167005, // Taiko A1
  167006, // Taiko B1
  167007, // Taiko A2
  167008, // Taiko B2
  169,    // Manta Pacific
  3441005, // Manta Pacific Testnet
  1101,   // Polygon zkEVM
  1442,   // Polygon zkEVM Testnet
  5001,   // Mantle Testnet
  2522,   // Frax Testnet
  588,    // Metis Stardust
  1287,   // Moonbase Alpha
  1285,   // Moonriver
  1284,   // Moonbeam
  200101, // Milkomeda C1 Testnet
  44787,  // Celo Alfajores
  42220,  // Celo
  1313161555, // Aurora Testnet
  338,    // Cronos Testnet
  2888,   // Boba Network Goerli
  111,    // Velas Testnet
  5700,   // Syscoin Tanenbaum
  63,     // Ethereum Classic Testnet
  41,     // Telos Testnet
  46688,  // Fusion Testnet
  83,     // Meter Testnet
  51,     // XDC Apothem
  114,    // Flare Testnet
  16,     // Songbird Testnet
  123,    // Fuse Sparknet
  336,    // Shiden
  81,     // Shiden Shibuya
  592,    // Astar
  81,     // Astar Shibuya
  1023,   // CLV Testnet
  1113,   // WEMIX3.0 Testnet
  9000,   // Evmos Testnet
  335,    // DFK Testnet
  1001,   // Klaytn Baobab
  888,    // Wanchain Testnet
  2400,   // Zyx Testnet
  17000,  // Hoo Testnet
  32520,  // Bitgert Testnet
  1819,   // Cube Testnet
  1230,   // Ultron Testnet
  1231,   // Ultron
]

export function ChainSelector({
  isOpen,
  onOpenChange,
  selectedChain,
  onSelectChain,
  title = "Select Chain",
  excludeChainId
}: ChainSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const availableChains = useMemo(() => {
    return CROSS_CHAIN_SUPPORTED_CHAIN_IDS
      .filter(chainId => chainId !== excludeChainId)
      .map(chainId => {
        const chain = getChainById(chainId)
        return chain ? {
          id: chain.id,
          name: chain.name,
          nativeCurrency: chain.nativeCurrency
        } : null
      })
      .filter(Boolean) as Chain[]
  }, [excludeChainId])

  const filteredChains = useMemo(() => {
    if (!searchQuery.trim()) return availableChains

    const query = searchQuery.toLowerCase()
    return availableChains.filter(chain =>
      chain.name.toLowerCase().includes(query) ||
      chain.nativeCurrency.symbol.toLowerCase().includes(query) ||
      chain.id.toString().includes(query)
    )
  }, [availableChains, searchQuery])

  const handleSelectChain = (chain: Chain) => {
    onSelectChain(chain)
    onOpenChange(false)
    setSearchQuery("")
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>
          Choose a destination chain for your cross-chain swap.
        </Dialog.Description>

        {/* Search */}
        <Flex direction="column" gap="3" mt="4">
          <TextField.Root
            placeholder="Search chains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          >
            <TextField.Slot>
              <SearchIcon size={16} />
            </TextField.Slot>
          </TextField.Root>

          {/* Chain List */}
          <ScrollArea style={{ height: 300 }}>
            <Flex direction="column" gap="2">
              {filteredChains.length > 0 ? (
                filteredChains.map((chain) => (
                  <Card
                    key={chain.id}
                    variant="ghost"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectChain(chain)}
                  >
                    <Flex align="center" justify="between" p="2">
                      <Flex align="center" gap="3">
                        <Avatar
                          color="gray"
                          radius="full"
                          size="2"
                          fallback={chain.nativeCurrency.symbol.slice(0, 2).toUpperCase()}
                        />
                        <Flex direction="column">
                          <Text size="3" weight="bold">
                            {chain.name}
                          </Text>
                          <Text size="2" color="gray">
                            {chain.nativeCurrency.symbol}
                          </Text>
                        </Flex>
                      </Flex>

                      <Text size="2" color="gray">
                        {chain.id}
                      </Text>
                    </Flex>
                  </Card>
                ))
              ) : (
                <Flex direction="column" align="center" py="4">
                  <Text size="2" color="gray">
                    No chains found matching "{searchQuery}"
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
