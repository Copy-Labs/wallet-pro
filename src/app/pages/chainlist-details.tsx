import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer"
import { useChainList } from "~/hooks/useChainList"
import { useCustomNetworks } from "~/store/ui-store"
import { saveCustomNetwork, getCustomNetworkByChainId } from "~/utils/storage"
import { validateRpcEndpoint, validateChainIdUniqueness } from "~/utils/network-validation"
import { networkHealthMonitor } from "~/utils/network-health-monitor"
import {
  Card,
  Text,
  Badge,
  Button,
  Flex,
  Spinner,
  AlertDialog,
  Callout,
  Avatar,
  Heading,
  Box,
  Link, Grid, Strong
} from "@radix-ui/themes"
import {CheckCircle, AlertCircle, Wifi, WifiOff, Plus, LucideInfo, LucideExternalLink} from "lucide-react"
import type { ChainData } from "~/hooks/useChainList"
import type { CustomNetwork } from "~/types/network"
import {capitalize} from "~utils";
import {DotSpacer} from "~components/DotSpacer";
import {toHex} from "viem";

export function ChainListDetailsPage() {
  const navigate = useNavigate()
  const { chainId } = useParams<{ chainId: string }>()
  const { data: chainListData, isLoading, error } = useChainList()
  const customNetworks = useCustomNetworks()

  const [selectedRpcUrl, setSelectedRpcUrl] = useState<string>("")
  const [testingRpc, setTestingRpc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  // Find the chain data
  const chainData = chainListData?.find(
    (chain: ChainData) => chain.chainId.toString() === chainId
  )

  // Check if already added
  const existingNetwork = customNetworks.find(n => n.chainId === parseInt(chainId || "0"))
  const isAlreadyAdded = !!existingNetwork

  useEffect(() => {
    if (chainData?.rpc?.[0]?.url) {
      setSelectedRpcUrl(chainData.rpc[0].url)
    }
  }, [chainData])

  const testRpcEndpoint = async (rpcUrl: string) => {
    setTestingRpc(true)
    try {
      const result = await validateRpcEndpoint(rpcUrl)
      return result.isValid
    } catch (error) {
      console.error('RPC test failed:', error)
      return false
    } finally {
      setTestingRpc(false)
    }
  }

  const handleAddNetwork = async () => {
    if (!chainData || isAlreadyAdded) return

    setSaving(true)
    try {
      // Validate chain ID uniqueness
      const chainIdNum = chainData.chainId
      const uniquenessCheck = await validateChainIdUniqueness(chainIdNum)

      if (!uniquenessCheck.isValid) {
        alert(`Chain ID ${chainIdNum} already exists: ${uniquenessCheck.error}`)
        return
      }

      // Test the selected RPC endpoint
      const rpcValid = await testRpcEndpoint(selectedRpcUrl)
      if (!rpcValid) {
        alert('Selected RPC endpoint is not valid. Please choose a different one.')
        return
      }

      // Create custom network object
      const customNetwork: CustomNetwork = {
        id: `chainlist_${chainData.chainId}_${Date.now()}`,
        name: chainData.name,
        chainId: chainData.chainId,
        rpcUrl: selectedRpcUrl,
        currency: {
          name: chainData.nativeCurrency.name,
          symbol: chainData.nativeCurrency.symbol,
          decimals: chainData.nativeCurrency.decimals
        },
        blockExplorerUrl: chainData.explorers?.[0]?.url,
        isActive: true,
        dateAdded: Date.now(),
        status: 'offline'
      }

      // Save the network
      await saveCustomNetwork(customNetwork)

      // Start health monitoring for the new network
      await networkHealthMonitor.addNetworkToMonitoring(customNetwork.id)

      setShowSuccessDialog(true)

    } catch (error) {
      console.error('Failed to add network:', error)
      alert('Failed to add network. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    navigate('/networks/custom')
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader showBackButton>
          <PageHeading>Loading Chain Details</PageHeading>
        </PageHeader>
        <Flex
          height={'100%'}
          width={'100%'}
          direction={'column'}
          align={'center'}
          justify={'center'}
        >
          <Flex direction={'column'} align={'center'}>
            <Spinner size={'3'} />
            <Text>Loading chain details...</Text>
          </Flex>
        </Flex>
      </PageContainer>
    )
  }

  if (error || !chainData) {
    return (
      <PageContainer>
        <PageHeader showBackButton>
          <PageHeading>Loading Chain Details</PageHeading>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 text-center max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <Text size="3" weight="bold" className="mb-2">
              Network Not Found
            </Text>
            <Text color="gray">
              The requested network could not be found or failed to load.
            </Text>
          </Card>
        </div>
        <BottomNavigation />
      </PageContainer>
    )
  }

  const networkButton = (
    <Card>
      <Flex align="center" justify="between" gap="2">
        <Box>
          <Heading size="2" mb="1">
            Add Network
          </Heading>
          <Text size="2" color="gray">
            Add this network to your wallet
          </Text>
        </Box>
        <Button
          className={'cursor-pointer'}
          color={'grass'}
          disabled={saving}
          loading={saving}
          size="2"
          variant="solid"
          onClick={handleAddNetwork}
        >
          {/*<Spinner loading={isSubmitting} />*/}
          {saving ? 'Adding...' : 'Add to Wallet'}
        </Button>
      </Flex>
    </Card>
  );

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>{chainData.name}</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction="column" gap="4" py={'2'}>
          {isAlreadyAdded && (
            <Callout.Root color={'grass'}>
              <Callout.Icon>
                <LucideInfo size={16} />
              </Callout.Icon>
              <Callout.Text>
                {isAlreadyAdded ? 'Network already added' : 'Network not added'}
              </Callout.Text>
            </Callout.Root>
          )}

          <Card>
            <Flex direction={'column'} gap={'3'}>
              <Flex gap="4" align="center">
                <Avatar
                  size="6"
                  src={`https://icons.llamao.fi/icons/chains/rsz_${
                    chainData.chainSlug || chainData.icon
                  }.jpg`}
                  radius="full"
                  fallback={chainData.name[0]}
                />
                <Flex direction="column" gap="1">
                  <Heading size="4">{chainData.name}</Heading>
                  <Text color="gray" size={'3'} weight={'medium'}>
                    {capitalize(chainData.chainSlug || chainData.shortName)}
                  </Text>
                </Flex>
              </Flex>
              <Box>
                <Flex align="center" gap="2">
                  <Text color="gray" size={'2'} weight={'bold'}>
                    {chainData.nativeCurrency.symbol}
                  </Text>
                  <DotSpacer />
                  <Text color="gray" size={'2'} weight={'bold'}>
                    Network ID: {chainData.networkId} (
                    {/*{ethers.toBeHex(chainData.chainId)})*/}
                    {toHex(chainData.chainId)})
                  </Text>
                </Flex>
              </Box>

              {chainData.features?.length > 0 && (
                <Card>
                  <Heading size="2" mb="4" color={'gray'}>
                    Network Features
                  </Heading>
                  <Flex gap="2" wrap="wrap">
                    {chainData.features?.map((feature) => (
                      /*<Text key={feature.name} className="plasmo-bg-[var(--accent-3)] plasmo-px-2 plasmo-py-1 plasmo-rounded">
                        {feature.name}
                      </Text>*/
                      <Badge key={feature.name} size="3" color="gray">
                        {feature.name}
                      </Badge>
                    ))}
                  </Flex>
                </Card>
              )}
            </Flex>
          </Card>

          <Card>
            <Link
              href={chainData.infoURL}
              target={'_blank'}
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Learn more about {chainData.chainSlug} here...
              <LucideExternalLink size={14} />
            </Link>
          </Card>

          {/* Show Network Button if not already added */}
          {!isAlreadyAdded && networkButton}

          <Grid columns="1" gap="4">
            <Card>
              <Heading size="2" mb="4" color={'gray'}>
                Native Currency
              </Heading>
              <Flex direction={'column'} gapY={'2'}>
                <Text as="div">
                  Name: <Strong>{chainData.nativeCurrency.name}</Strong>
                </Text>
                <Text as="div">
                  Symbol: <Strong>{chainData.nativeCurrency.symbol}</Strong>
                </Text>
                <Text as="div">
                  Decimals: <Strong>{chainData.nativeCurrency.decimals}</Strong>
                </Text>
              </Flex>
            </Card>
          </Grid>

          {/* Network Info Card */}
          <Card className="p-4">
            <Flex direction="column" gap="3">
              <Flex gap="3" align="center">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl">
                  {chainData.icon ? (
                    <img src={chainData.icon} alt={chainData.name} className="w-8 h-8" />
                  ) : (
                    <span>{chainData.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1">
                  <Flex align="center" gap="2" className="mb-1">
                    <Text size="4" weight="bold">
                      {chainData.name}
                    </Text>
                    {isAlreadyAdded && (
                      <Badge color="green">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Added
                      </Badge>
                    )}
                  </Flex>
                  <Text size="2" color="gray">
                    {chainData.nativeCurrency.symbol} • Chain ID: {chainData.chainId}
                  </Text>
                </div>
              </Flex>

              {chainData.infoURL && (
                <Button variant="soft" size="2" asChild>
                  <a href={chainData.infoURL} target="_blank" rel="noopener noreferrer">
                    Learn More
                  </a>
                </Button>
              )}
            </Flex>
          </Card>

          {/* Native Currency Card */}
          <Card className="p-4">
            <Text size="3" weight="bold" className="mb-3">
              Native Currency
            </Text>
            <Flex direction="column" gap="2">
              <div>
                <Text size="2" color="gray">Name:</Text>
                <Text size="2" weight="bold">{chainData.nativeCurrency.name}</Text>
              </div>
              <div>
                <Text size="2" color="gray">Symbol:</Text>
                <Text size="2" weight="bold">{chainData.nativeCurrency.symbol}</Text>
              </div>
              <div>
                <Text size="2" color="gray">Decimals:</Text>
                <Text size="2" weight="bold">{chainData.nativeCurrency.decimals}</Text>
              </div>
            </Flex>
          </Card>

          {/* RPC Endpoints Card */}
          <Card className="p-4">
            <Text size="3" weight="bold" className="mb-3">
              RPC Endpoints
            </Text>
            <Flex direction="column" gap="2">
              {chainData.rpc?.map((rpc, index) => (
                <Flex
                  key={index}
                  align="center"
                  justify="between"
                  className={`p-3 rounded-lg border ${
                    selectedRpcUrl === rpc.url
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <Text size="2" className="break-all">{rpc.url}</Text>
                  </div>
                  <Button
                    size="1"
                    variant={selectedRpcUrl === rpc.url ? "solid" : "soft"}
                    onClick={() => setSelectedRpcUrl(rpc.url)}
                    className="ml-2"
                  >
                    {selectedRpcUrl === rpc.url ? 'Selected' : 'Select'}
                  </Button>
                </Flex>
              ))}
            </Flex>
          </Card>

          {/* Block Explorers Card */}
          {chainData.explorers?.length > 0 && (
            <Card className="p-4">
              <Text size="3" weight="bold" className="mb-3">
                Block Explorers
              </Text>
              <Flex direction="column" gap="2">
                {chainData.explorers.map((explorer, index) => (
                  <Button key={index} variant="soft" size="2" asChild>
                    <a href={explorer.url} target="_blank" rel="noopener noreferrer">
                      {explorer.name}
                    </a>
                  </Button>
                ))}
              </Flex>
            </Card>
          )}

          {/* Faucets Card */}
          {chainData.faucets?.length > 0 && (
            <Card className="p-4">
              <Text size="3" weight="bold" className="mb-3">
                Faucets
              </Text>
              <Flex direction="column" gap="2">
                {chainData.faucets.map((faucet, index) => (
                  <Button key={index} variant="soft" size="2" asChild>
                    <a href={faucet} target="_blank" rel="noopener noreferrer">
                      {faucet}
                    </a>
                  </Button>
                ))}
              </Flex>
            </Card>
          )}

          {/* Action Button */}
          {!isAlreadyAdded && (
            <Card className="p-4">
              <Button
                size="3"
                className="w-full"
                onClick={handleAddNetwork}
                disabled={saving || !selectedRpcUrl}
              >
                {saving ? (
                  <>
                    <Spinner size="1" className="mr-2" />
                    Adding Network...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Wallet
                  </>
                )}
              </Button>
            </Card>
          )}

          {isAlreadyAdded && (
            <Card className="p-4">
              <Flex align="center" gap="2" className="text-green-600">
                <CheckCircle className="w-5 h-5" />
                <Text size="3" weight="bold">
                  Network Already Added
                </Text>
              </Flex>
              <Text size="2" color="gray" className="mt-1">
                This network is already available in your wallet.
              </Text>
            </Card>
          )}
        </Flex>
      </PageBody>

      {/* Success Dialog */}
      <AlertDialog.Root open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialog.Content>
          <AlertDialog.Title>Network Added Successfully!</AlertDialog.Title>
          <AlertDialog.Description>
            {chainData.name} has been added to your custom networks. You can now select it from the network dropdown.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Action onClick={handleSuccessDialogClose}>
              <Button highContrast variant={'soft'}>View Custom Networks</Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </PageContainer>
  )
}
