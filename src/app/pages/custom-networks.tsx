import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import { PageContainer } from "~components/PageContainer"
import { getCustomNetworks, deleteCustomNetwork, updateCustomNetworkStatus } from "~utils/storage"
import { testNetworkConnectivity } from "~utils/network-validation"
import type { CustomNetwork } from "~types/network"

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
        <WalletHeader title="Custom Networks" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading custom networks...</div>
        </div>
        <BottomNavigation />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <WalletHeader title="Custom Networks" />

      <div className="flex-1 overflow-auto pb-16">
        <div className="p-4">
          {/* Add Network Button */}
          <div className="mb-4">
            <button
              onClick={() => navigate('/networks/add')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium"
            >
              + Add Custom Network
            </button>
          </div>

          {/* Custom Networks List */}
          {customNetworks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">No custom networks added yet</div>
              <div className="text-sm text-gray-400">
                Add your first custom network to get started
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {customNetworks.map((network) => (
                <div
                  key={network.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-white">{network.name}</h3>
                      <span className={`text-sm ${getStatusColor(network.status)}`}>
                        {getStatusIcon(network.status)} {network.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/networks/edit/${network.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNetwork(network.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-gray-400">
                    <div>Chain ID: {network.chainId}</div>
                    <div>RPC: {network.rpcUrl}</div>
                    <div>Currency: {network.currency.symbol} ({network.currency.name})</div>
                    {network.blockExplorerUrl && (
                      <div>Explorer: {network.blockExplorerUrl}</div>
                    )}
                    <div>Added: {new Date(network.dateAdded).toLocaleDateString()}</div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => handleTestConnectivity(network)}
                      disabled={testingNetworks.has(network.id)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 py-1 px-3 rounded disabled:opacity-50"
                    >
                      {testingNetworks.has(network.id) ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </PageContainer>
  )
}
