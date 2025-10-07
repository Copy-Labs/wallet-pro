/**
 * Wallet Selector Component
 * Implements EIP-6963 multi-wallet discovery and selection
 */

import React, { useState, useEffect } from "react"
import { Button, Flex, Text, Box, Card, Dialog, Heading, Avatar } from "@radix-ui/themes"
import { Wallet, CheckCircle, ExternalLink } from "lucide-react"

interface WalletInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface DetectedWallet {
  info: WalletInfo
  provider: any
}

interface WalletSelectorProps {
  onWalletSelect?: (wallet: DetectedWallet) => void
  autoDetect?: boolean
}

export function WalletSelector({ onWalletSelect, autoDetect = true }: WalletSelectorProps) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (autoDetect) {
      detectWallets()
    }
  }, [autoDetect])

  const detectWallets = () => {
    const detected: DetectedWallet[] = []

    // Listen for wallet announcements
    const handleAnnounce = (event: any) => {
      if (event.detail && event.detail.info) {
        // Check if wallet already detected
        const exists = detected.find(w => w.info.rdns === event.detail.info.rdns)
        if (!exists) {
          detected.push(event.detail)
          setWallets([...detected])
        }
      }
    }

    window.addEventListener('eip6963:announceProvider', handleAnnounce)

    // Request all wallets to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    // Wait a bit for all wallets to respond
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce)
      console.log('[Wallet Selector] Detected wallets:', detected.length)
    }, 1000)
  }

  const handleSelectWallet = (wallet: DetectedWallet) => {
    setSelectedWallet(wallet.info.rdns)
    
    // Store preference in localStorage
    try {
      const preferences = JSON.parse(localStorage.getItem('wallet_preferences') || '{}')
      preferences[window.location.origin] = {
        rdns: wallet.info.rdns,
        timestamp: Date.now()
      }
      localStorage.setItem('wallet_preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save wallet preference:', error)
    }

    // Callback
    if (onWalletSelect) {
      onWalletSelect(wallet)
    }

    setIsOpen(false)
  }

  const getStoredPreference = (): string | null => {
    try {
      const preferences = JSON.parse(localStorage.getItem('wallet_preferences') || '{}')
      const pref = preferences[window.location.origin]
      return pref?.rdns || null
    } catch {
      return null
    }
  }

  useEffect(() => {
    const preferred = getStoredPreference()
    if (preferred) {
      setSelectedWallet(preferred)
    }
  }, [])

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button size="3" variant="solid">
          <Wallet size={20} />
          {selectedWallet 
            ? `Connected: ${wallets.find(w => w.info.rdns === selectedWallet)?.info.name || 'Wallet'}`
            : 'Connect Wallet'
          }
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>
          <Heading size="5">Select Wallet</Heading>
        </Dialog.Title>

        <Dialog.Description size="2" mb="4">
          Choose which wallet you'd like to connect with
        </Dialog.Description>

        <Flex direction="column" gap="3">
          {wallets.length === 0 ? (
            <Card>
              <Flex direction="column" align="center" gap="3" py="4">
                <Wallet size={48} color="gray" />
                <Text size="2" color="gray">
                  No wallets detected. Please install a Web3 wallet extension.
                </Text>
                <Button
                  size="2"
                  variant="soft"
                  onClick={detectWallets}
                >
                  Refresh
                </Button>
              </Flex>
            </Card>
          ) : (
            wallets.map((wallet) => (
              <Card
                key={wallet.info.uuid}
                style={{
                  cursor: 'pointer',
                  border: selectedWallet === wallet.info.rdns 
                    ? '2px solid var(--accent-9)' 
                    : '1px solid var(--gray-6)',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleSelectWallet(wallet)}
              >
                <Flex align="center" gap="3" p="2">
                  {/* Wallet Icon */}
                  <Box>
                    {wallet.info.icon ? (
                      <img 
                        src={wallet.info.icon} 
                        alt={wallet.info.name}
                        style={{ width: 40, height: 40, borderRadius: '8px' }}
                      />
                    ) : (
                      <Avatar
                        size="3"
                        fallback={wallet.info.name.charAt(0)}
                        radius="medium"
                      />
                    )}
                  </Box>

                  {/* Wallet Info */}
                  <Flex direction="column" style={{ flex: 1 }}>
                    <Text size="3" weight="bold">
                      {wallet.info.name}
                    </Text>
                    <Text size="1" color="gray">
                      {wallet.info.rdns}
                    </Text>
                  </Flex>

                  {/* Selected Indicator */}
                  {selectedWallet === wallet.info.rdns && (
                    <CheckCircle size={24} color="var(--accent-9)" />
                  )}
                </Flex>
              </Card>
            ))
          )}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            onClick={detectWallets}
            variant="soft"
          >
            Refresh Wallets
          </Button>
        </Flex>

        {/* Info Box */}
        <Box mt="4" p="3" style={{ background: 'var(--gray-3)', borderRadius: '8px' }}>
          <Flex gap="2" align="start">
            <ExternalLink size={16} color="var(--gray-11)" />
            <Text size="1" color="gray">
              This uses EIP-6963 to detect installed wallet extensions. 
              Your selection will be remembered for this site.
            </Text>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  )
}

/**
 * Hook to use wallet selector functionality
 */
export function useWalletSelector() {
  const [wallets, setWallets] = useState<DetectedWallet[]>([])
  const [selectedWallet, setSelectedWallet] = useState<DetectedWallet | null>(null)

  const detectWallets = (): Promise<DetectedWallet[]> => {
    return new Promise((resolve) => {
      const detected: DetectedWallet[] = []

      const handleAnnounce = (event: any) => {
        if (event.detail && event.detail.info) {
          const exists = detected.find(w => w.info.rdns === event.detail.info.rdns)
          if (!exists) {
            detected.push(event.detail)
          }
        }
      }

      window.addEventListener('eip6963:announceProvider', handleAnnounce)
      window.dispatchEvent(new Event('eip6963:requestProvider'))

      setTimeout(() => {
        window.removeEventListener('eip6963:announceProvider', handleAnnounce)
        setWallets(detected)
        resolve(detected)
      }, 500)
    })
  }

  const selectWallet = (wallet: DetectedWallet) => {
    setSelectedWallet(wallet)
    
    // Store preference
    try {
      const preferences = JSON.parse(localStorage.getItem('wallet_preferences') || '{}')
      preferences[window.location.origin] = {
        rdns: wallet.info.rdns,
        timestamp: Date.now()
      }
      localStorage.setItem('wallet_preferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save wallet preference:', error)
    }
  }

  const getPreferredWallet = (): DetectedWallet | null => {
    try {
      const preferences = JSON.parse(localStorage.getItem('wallet_preferences') || '{}')
      const pref = preferences[window.location.origin]
      if (pref?.rdns) {
        return wallets.find(w => w.info.rdns === pref.rdns) || null
      }
    } catch {
      return null
    }
    return null
  }

  return {
    wallets,
    selectedWallet,
    detectWallets,
    selectWallet,
    getPreferredWallet
  }
}

export default WalletSelector

