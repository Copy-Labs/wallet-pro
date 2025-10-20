import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer"
import { getCustomNetworks, deleteCustomNetwork, updateCustomNetworkStatus } from "~utils/storage"
import { testNetworkConnectivity } from "~utils/network-validation"
import type { CustomNetwork } from "~types/network"
import {Badge, Button, Card, Code, DataList, Flex, Heading, IconButton, Text} from "@radix-ui/themes";
import {cn} from "~lib/utils";
import {GlobeIcon} from "lucide-react";

export function CustomNetworksPage() {
  const [customNetworks, setCustomNetworks] = useState<CustomNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [testingNetworks, setTestingNetworks] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    loadCustomNetworks()
  }, [])

  const loadCustomNetworks = async () => {
    try {
      setLoading(true)
      const networks = await getCustomNetworks()
      networks.sort((a, b) => b.dateAdded - a.dateAdded)
      setCustomNetworks(networks)
    } catch (error) {
      console.error('Failed to load custom networks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNetwork = async (networkId: string) => {
    if (confirm('Are you sure you want to delete this custom network?')) {
      try {
        await deleteCustomNetwork(networkId)
        await loadCustomNetworks()
      } catch (error) {
        console.error('Failed to delete network:', error)
        alert('Failed to delete network. Please try again.')
      }
    }
  }

  const handleTestConnectivity = async (network: CustomNetwork) => {
    setTestingNetworks(prev => new Set(prev).add(network.id))

    try {
      await updateCustomNetworkStatus(network.id, 'checking')
      const result = await testNetworkConnectivity(network)

      if (result.isOnline) {
        await updateCustomNetworkStatus(network.id, 'online')
      } else {
        await updateCustomNetworkStatus(network.id, 'offline')
      }

      await loadCustomNetworks()
    } catch (error) {
      console.error('Failed to test connectivity:', error)
      await updateCustomNetworkStatus(network.id, 'offline')
      await loadCustomNetworks()
    } finally {
      setTestingNetworks(prev => {
        const newSet = new Set(prev)
        newSet.delete(network.id)
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'offline': return 'text-red-500'
      case 'checking': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '●'
      case 'offline': return '●'
      case 'checking': return '◐'
      default: return '○'
    }
  }

  if (loading) {
    return (
      <PageContainer>
        {/*<WalletHeader title="Custom Networks" />*/}
        <PageHeader>
          <PageHeading>Custom Networks</PageHeading>
        </PageHeader>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading custom networks...</div>
        </div>
        <BottomNavigation />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/*<WalletHeader title="Custom Networks" />*/}
      <PageHeader>
        <PageHeading>Custom Networks</PageHeading>
      </PageHeader>

      <PageBody>
        <div className="p-4">
          {/* Custom Networks List */}
          {customNetworks.length === 0 ? (
            <div className="text-center py-8">
              <Text size={'2'} className="mb-2">No custom networks added yet</Text>
              <Text color={'gray'} size={'1'} className="">
                Add your first custom network to get started
              </Text>
            </div>
          ) : (
            <div className="space-y-3">
              {customNetworks.map((network) => (
                <Card
                  key={network.id}
                  // className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <Flex align={'center'} justify={'between'} mb={'2'} className="">
                    <Flex align={'center'} gap={'2'} className="">
                      <Heading size={'3'}>{network.name}</Heading>
                      {/*<Text size={'1'} className={cn(getStatusColor(network.status))}>
                        {getStatusIcon(network.status)} {network.status}
                      </Text>*/}
                    </Flex>
                    <Flex align={'center'} gap={'4'} className="">
                      <Button
                        color={'blue'}
                        size={'1'}
                        variant={'ghost'}
                        onClick={() => navigate(`/networks/edit/${network.id}`)}
                        // className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1"
                      >
                        Edit
                      </Button>
                      <Button
                        color={'red'}
                        size={'1'}
                        variant={'ghost'}
                        onClick={() => handleDeleteNetwork(network.id)}
                        // className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                      >
                        Delete
                      </Button>
                    </Flex>
                  </Flex>

                  <Flex direction={'column'} className="" gap={'1'} maxWidth={'100%'}>
                    <DataList.Root>
                      <DataList.Item align="center">
                        <DataList.Label minWidth="88px">Status</DataList.Label>
                        <DataList.Value>
                          <Badge className={cn(getStatusColor(network.status))} variant="soft" radius="full">
                            {getStatusIcon(network.status)} {network.status}
                          </Badge>
                        </DataList.Value>
                      </DataList.Item>
                      <DataList.Item>
                        <DataList.Label minWidth="88px">Chain ID</DataList.Label>
                        <DataList.Value>
                          <Flex align="center" gap="2">
                            <Code size={'2'} variant="ghost">{network.chainId}</Code>
                          </Flex>
                        </DataList.Value>
                      </DataList.Item>
                      <DataList.Item>
                        <DataList.Label minWidth="88px">Currency</DataList.Label>
                        <DataList.Value>
                          <Text size={'2'}>{network.currency.symbol} ({network.currency.name})</Text>
                        </DataList.Value>
                      </DataList.Item>
                      <DataList.Item>
                        <DataList.Label minWidth="88px">Explorer</DataList.Label>
                        <DataList.Value>
                          {network.blockExplorerUrl && (
                            <Text size={'2'}>{network.blockExplorerUrl}</Text>
                          )}
                        </DataList.Value>
                      </DataList.Item>
                      <DataList.Item>
                        <DataList.Label minWidth="88px">RPC</DataList.Label>
                        <DataList.Value>
                          <Text size={'2'}>{network.rpcUrl}</Text>
                        </DataList.Value>
                      </DataList.Item>
                      <DataList.Item>
                        <DataList.Label minWidth="88px">Added</DataList.Label>
                        <DataList.Value>
                          <Text size={'2'}>
                            {new Date(network.dateAdded).toLocaleDateString()}
                          </Text>
                        </DataList.Value>
                      </DataList.Item>
                    </DataList.Root>

                    {/*<Text color={'gray'} size={'1'}>Chain ID: {network.chainId}</Text>
                    <Text color={'gray'} size={'1'} trim={'both'}>RPC: {network.rpcUrl}</Text>
                    <Text color={'gray'} size={'1'}>
                      Currency: {network.currency.symbol} ({network.currency.name})
                    </Text>
                    {network.blockExplorerUrl && (
                      <Text color={'gray'} size={'1'}>Explorer: {network.blockExplorerUrl}</Text>
                    )}
                    <Text color={'gray'} size={'1'}>Added: {new Date(network.dateAdded).toLocaleDateString()}</Text>*/}
                  </Flex>

                  <div className="mt-3">
                    <Button
                      // className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded disabled:opacity-50"
                      disabled={testingNetworks.has(network.id)}
                      size={'1'}
                      variant={'soft'}
                      onClick={() => handleTestConnectivity(network)}
                    >
                      {testingNetworks.has(network.id) ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageBody>

      {/* Add Network Button */}
      <div className="p-2">
        <Button
          highContrast
          className="w-full"
          size={'2'}
          variant={'soft'}
          onClick={() => navigate('/networks/add')}
        >
          + Add Custom Network
        </Button>
      </div>


      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
