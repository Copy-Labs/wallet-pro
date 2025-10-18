import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer"
import { validateNetworkConfiguration, validateRpcEndpoint, validateChainIdUniqueness } from "~utils/network-validation"
import { getCustomNetworkById, updateCustomNetwork, deleteCustomNetwork } from "~utils/storage"
import type { CustomNetworkFormData, NetworkValidationResult, CustomNetwork } from "~types/network"
import {Flex} from "@radix-ui/themes";

export function EditCustomNetworkPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [network, setNetwork] = useState<CustomNetwork | null>(null)
  const [formData, setFormData] = useState<CustomNetworkFormData>({
    name: '',
    chainId: '',
    rpcUrl: '',
    currencyName: '',
    currencySymbol: '',
    currencyDecimals: '18',
    blockExplorerUrl: ''
  })
  const [validation, setValidation] = useState<NetworkValidationResult | null>(null)
  const [testingRpc, setTestingRpc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadNetwork(id)
    }
  }, [id])

  const loadNetwork = async (networkId: string) => {
    try {
      setLoading(true)
      const networkData = await getCustomNetworkById(networkId)

      if (!networkData) {
        alert('Network not found')
        navigate('/networks/custom')
        return
      }

      setNetwork(networkData)

      // Populate form data
      setFormData({
        name: networkData.name,
        chainId: networkData.chainId.toString(),
        rpcUrl: networkData.rpcUrl,
        currencyName: networkData.currency.name,
        currencySymbol: networkData.currency.symbol,
        currencyDecimals: networkData.currency.decimals.toString(),
        blockExplorerUrl: networkData.blockExplorerUrl || ''
      })
    } catch (error) {
      console.error('Failed to load network:', error)
      alert('Failed to load network')
      navigate('/networks/custom')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CustomNetworkFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear validation errors when user starts typing
    if (validation?.errors[field]) {
      setValidation(prev => prev ? {
        ...prev,
        errors: { ...prev.errors, [field]: undefined }
      } : null)
    }
  }

  const handleTestRpc = async () => {
    if (!formData.rpcUrl.trim()) {
      setValidation(prev => prev ? {
        ...prev,
        errors: { ...prev.errors, rpcUrl: 'RPC URL is required to test' }
      } : {
        isValid: false,
        errors: { rpcUrl: 'RPC URL is required to test' }
      })
      return
    }

    setTestingRpc(true)
    try {
      const result = await validateRpcEndpoint(formData.rpcUrl)

      if (result.isValid) {
        alert('RPC endpoint is valid and reachable!')
      } else {
        setValidation(prev => prev ? {
          ...prev,
          errors: { ...prev.errors, rpcUrl: result.error || 'RPC validation failed' }
        } : {
          isValid: false,
          errors: { rpcUrl: result.error || 'RPC validation failed' }
        })
      }
    } catch (error) {
      setValidation(prev => prev ? {
        ...prev,
        errors: { ...prev.errors, rpcUrl: 'Failed to test RPC endpoint' }
      } : {
        isValid: false,
        errors: { rpcUrl: 'Failed to test RPC endpoint' }
      })
    } finally {
      setTestingRpc(false)
    }
  }

  const handleSave = async () => {
    if (!network) return

    // Validate form
    const validationResult = validateNetworkConfiguration(formData)
    setValidation(validationResult)

    if (!validationResult.isValid) {
      return
    }

    setSaving(true)
    try {
      // Check chain ID uniqueness (excluding current network)
      const chainIdNum = parseInt(formData.chainId)
      const chainIdValidation = await validateChainIdUniqueness(chainIdNum, network.id)

      if (!chainIdValidation.isValid) {
        setValidation(prev => prev ? {
          ...prev,
          errors: { ...prev.errors, chainId: chainIdValidation.error || 'Chain ID already exists' }
        } : {
          isValid: false,
          errors: { chainId: chainIdValidation.error || 'Chain ID already exists' }
        })
        return
      }

      // Update custom network object
      const updatedNetwork: CustomNetwork = {
        ...network,
        name: formData.name.trim(),
        chainId: chainIdNum,
        rpcUrl: formData.rpcUrl.trim(),
        currency: {
          name: formData.currencyName.trim(),
          symbol: formData.currencySymbol.trim().toUpperCase(),
          decimals: parseInt(formData.currencyDecimals)
        },
        blockExplorerUrl: formData.blockExplorerUrl.trim() || undefined,
        lastUsed: Date.now()
      }

      // Save the updated network
      await updateCustomNetwork(updatedNetwork)

      // Navigate back to custom networks list
      navigate('/networks/custom')
    } catch (error) {
      console.error('Failed to update custom network:', error)
      setValidation(prev => prev ? {
        ...prev,
        errors: { ...prev.errors, general: 'Failed to update network. Please try again.' }
      } : {
        isValid: false,
        errors: { general: 'Failed to update network. Please try again.' }
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!network) return

    if (confirm('Are you sure you want to delete this custom network? This action cannot be undone.')) {
      try {
        await deleteCustomNetwork(network.id)
        navigate('/networks/custom')
      } catch (error) {
        console.error('Failed to delete network:', error)
        alert('Failed to delete network. Please try again.')
      }
    }
  }

  const handleCancel = () => {
    navigate('/networks/custom')
  }

  if (loading) {
    return (
      <PageContainer>
        {/*<WalletHeader title="Edit Custom Network" />*/}
        <PageHeader>
          <PageHeading>Edit Network</PageHeading>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading network...</div>
        </div>
        <BottomNavigation />
      </PageContainer>
    )
  }

  if (!network) {
    return (
      <PageContainer>
        {/*<WalletHeader title="Edit Custom Network" />*/}
        <PageHeader>
          <PageHeading>Edit Network</PageHeading>
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Network not found</div>
        </div>
        <BottomNavigation />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/*<WalletHeader title="Edit Custom Network" />*/}
      <PageHeader>
        <PageHeading>Edit Network</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} gap={'4'} className="p-4">
          {/* Network Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Network Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Polygon Mainnet"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                validation?.errors.name ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validation?.errors.name && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.name}</div>
            )}
          </div>

          {/* Chain ID */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chain ID *
            </label>
            <input
              type="number"
              value={formData.chainId}
              onChange={(e) => handleInputChange('chainId', e.target.value)}
              placeholder="e.g., 137"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                validation?.errors.chainId ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validation?.errors.chainId && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.chainId}</div>
            )}
          </div>

          {/* RPC URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              RPC URL *
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={formData.rpcUrl}
                onChange={(e) => handleInputChange('rpcUrl', e.target.value)}
                placeholder="https://rpc.example.com"
                className={`flex-1 bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                  validation?.errors.rpcUrl ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              <button
                onClick={handleTestRpc}
                disabled={testingRpc || !formData.rpcUrl.trim()}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
              >
                {testingRpc ? 'Testing...' : 'Test'}
              </button>
            </div>
            {validation?.errors.rpcUrl && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.rpcUrl}</div>
            )}
          </div>

          {/* Currency Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency Name *
            </label>
            <input
              type="text"
              value={formData.currencyName}
              onChange={(e) => handleInputChange('currencyName', e.target.value)}
              placeholder="e.g., Polygon"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                validation?.errors.currencyName ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validation?.errors.currencyName && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.currencyName}</div>
            )}
          </div>

          {/* Currency Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency Symbol *
            </label>
            <input
              type="text"
              value={formData.currencySymbol}
              onChange={(e) => handleInputChange('currencySymbol', e.target.value.toUpperCase())}
              placeholder="e.g., MATIC"
              maxLength={10}
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                validation?.errors.currencySymbol ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validation?.errors.currencySymbol && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.currencySymbol}</div>
            )}
          </div>

          {/* Currency Decimals */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency Decimals *
            </label>
            <input
              type="number"
              value={formData.currencyDecimals}
              onChange={(e) => handleInputChange('currencyDecimals', e.target.value)}
              placeholder="18"
              min="0"
              max="18"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                validation?.errors.currencyDecimals ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validation?.errors.currencyDecimals && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.currencyDecimals}</div>
            )}
          </div>

          {/* Block Explorer URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Block Explorer URL (Optional)
            </label>
            <input
              type="url"
              value={formData.blockExplorerUrl}
              onChange={(e) => handleInputChange('blockExplorerUrl', e.target.value)}
              placeholder="https://explorer.example.com"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 ${
                validation?.errors.blockExplorerUrl ? 'border-red-500' : 'border-gray-600'
              }`}
            />
            {validation?.errors.blockExplorerUrl && (
              <div className="text-red-500 text-sm mt-1">{validation.errors.blockExplorerUrl}</div>
            )}
          </div>

          {/* General Error */}
          {validation?.errors.general && (
            <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {validation.errors.general}
            </div>
          )}

          {/* Network Info */}
          <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">
            <div>Added: {new Date(network.dateAdded).toLocaleDateString()}</div>
            {network.lastUsed && (
              <div>Last used: {new Date(network.lastUsed).toLocaleDateString()}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
              >
                {saving ? 'Saving...' : 'Update Network'}
              </button>
            </div>

            <button
              onClick={handleDelete}
              disabled={saving}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium"
            >
              Delete Network
            </button>
          </div>
        </Flex>
      </PageBody>

      <BottomNavigation />
    </PageContainer>
  )
}
