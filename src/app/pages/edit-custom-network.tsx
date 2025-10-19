import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer"
import { validateNetworkConfiguration, validateRpcEndpoint, validateChainIdUniqueness } from "~utils/network-validation"
import { getCustomNetworkById, updateCustomNetwork, deleteCustomNetwork } from "~utils/storage"
import type { CustomNetworkFormData, NetworkValidationResult, CustomNetwork } from "~types/network"
import {Button, Callout, Card, Flex, Text, TextField} from "@radix-ui/themes";
import {cn} from "~lib/utils";
import {LucideXOctagon} from "lucide-react";

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

      {/* General Error */}
      {validation?.errors.general && (
        <Callout.Root color="red" role="alert">
          <Callout.Icon>
            <LucideXOctagon size={16} strokeWidth={3} />
          </Callout.Icon>
          <Callout.Text>{validation?.errors.general}</Callout.Text>
        </Callout.Root>
      )}

      <PageBody>
        <Flex direction={'column'} gap={'4'} className="p-4">
          <Flex direction={'column'} gap={'5'}>
            {/* Network Info */}
            <Card size={'2'} variant={'classic'}>
              <Text>Added: {new Date(network.dateAdded).toLocaleDateString()}</Text>
              {network.lastUsed && (
                <Text>Last used: {new Date(network.lastUsed).toLocaleDateString()}</Text>
              )}
            </Card>

            {/* Network Name */}
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Network Name *
              </Text>
              <TextField.Root
                autoFocus
                required
                autoComplete={'off'}
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                title="Network name"
                placeholder="e.g., Polygon Mainnet"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              {validation?.errors.name && (
                <Text color={'red'} size={'1'} className="text-red-500 mt-1">{validation.errors.name}</Text>
              )}
            </Flex>

            {/* Chain ID */}
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Chain ID *
              </Text>
              <TextField.Root
                required
                // type={"number"}
                className={'h-[56px]'}
                size={'3'}
                variant={'soft'}
                placeholder="e.g., 137"
                value={formData.chainId}
                onChange={(e) => handleInputChange('chainId', e.target.value)}
                title="Chain ID (hex)"
              />
              {validation?.errors.chainId && (
                <Text color={'red'} size={'1'} className="">{validation.errors.chainId}</Text>
              )}
            </Flex>

            {/* RPC URL */}
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                RPC URL *
              </Text>
              <Flex align={'center'} gap={'2'} flexGrow={'1'}>
                <TextField.Root
                  type="url"
                  className={cn('grow h-[56px]', validation?.errors.rpcUrl ? 'border-ruby11' : '')}
                  placeholder="https://rpc.example.io"
                  size={'3'}
                  title="RPC URL"
                  value={formData.rpcUrl}
                  variant={'soft'}
                  onChange={(e) => handleInputChange('rpcUrl', e.target.value)}
                />
                <Button
                  className={'h-[56px]'}
                  disabled={testingRpc || !formData.rpcUrl.trim()}
                  size={'3'}
                  variant={'soft'}
                  onClick={handleTestRpc}
                >
                  {testingRpc ? 'Testing...' : 'Test'}
                </Button>
              </Flex>
              {validation?.errors.rpcUrl && (
                <Text color={'red'} size={'1'} className="">{validation.errors.rpcUrl}</Text>
              )}
            </Flex>

            {/* Currency Name */}
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Currency Name *
              </Text>
              <TextField.Root
                // type={"text"}
                className={'h-[56px]'}
                placeholder="e.g., Polygon"
                size={'3'}
                title="Currency Name"
                value={formData.currencyName}
                variant={'soft'}
                onChange={(e) => handleInputChange('currencyName', e.target.value)}
              />
              {validation?.errors.currencySymbol && (
                <Text color={'red'} size={'1'} className="">{validation.errors.currencyName}</Text>
              )}
            </Flex>

            <Flex align={'center'} gap={'3'} width={'100%'}>
              {/* Currency Symbol */}
              <Flex direction={'column'} gap={'2'} width={'100%'}>
                <Text size={'2'} weight={'medium'}>
                  Symbol *
                </Text>
                <Flex width={'100%'}>
                  <TextField.Root
                    // type={"text"}
                    className={'w-full h-[56px]'}
                    maxLength={10}
                    placeholder="e.g., MATIC"
                    size={'3'}
                    title="Symbol"
                    value={formData.currencySymbol}
                    variant={'soft'}
                    onChange={(e) => handleInputChange('currencySymbol', e.target.value.toUpperCase())}
                  />
                </Flex>
                {validation?.errors.currencySymbol && (
                  <Text color={'red'} size={'1'} className="">{validation.errors.currencySymbol}</Text>
                )}
              </Flex>

              {/* Currency Decimals */}
              <Flex direction={'column'} gap={'2'} width={'100%'}>
                <Text size={'2'} weight={'medium'}>
                  Decimal *
                </Text>
                <Flex width={'100%'} className={''}>
                  <TextField.Root
                    type={"number"}
                    className={'w-full h-[56px]'}
                    min="0"
                    max="18"
                    placeholder="18"
                    size={'3'}
                    title="Symbol"
                    value={formData.currencyDecimals}
                    variant={'soft'}
                    onChange={(e) => handleInputChange('currencyDecimals', e.target.value)}
                  />
                </Flex>
                {validation?.errors.currencyDecimals && (
                  <Text color={'red'} size={'1'} className="">{validation.errors.currencyDecimals}</Text>
                )}
              </Flex>
            </Flex>

            {/* Block Explorer URL */}
            <Flex direction={'column'} gap={'2'}>
              <Text size={'2'} weight={'medium'}>
                Block Explorer URL (Optional)
              </Text>
              <TextField.Root
                type="url"
                className={cn('h-[56px]', validation?.errors.blockExplorerUrl ? 'border-ruby11' : '')}
                placeholder="https://explorer.io"
                size={'3'}
                title="Block explorer URL"
                value={formData.blockExplorerUrl}
                variant={'soft'}
                onChange={(e) => handleInputChange('blockExplorerUrl', e.target.value)}
              />
              {validation?.errors.blockExplorerUrl && (
                <Text color={'red'} size={'1'} className="">{validation.errors.blockExplorerUrl}</Text>
              )}
            </Flex>
          </Flex>

          <div hidden>
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
          </div>
        </Flex>
      </PageBody>

      {/* Action Buttons */}
      <div className="space-y-3 p-2">
        <Flex align={'center'} gap={'3'}>
          {/*<Button*/}
          {/*  className="flex-1"*/}
          {/*  disabled={saving}*/}
          {/*  size={'3'}*/}
          {/*  variant={'soft'}*/}
          {/*  onClick={handleCancel}*/}
          {/*>*/}
          {/*  Cancel*/}
          {/*</Button>*/}
          <Button
            highContrast
            className="flex-1"
            disabled={saving}
            size={'3'}
            variant={'solid'}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Update Network'}
          </Button>
          <Button
            color={'red'}
            className=""
            disabled={saving}
            size={'3'}
            onClick={handleDelete}
          >
            Delete Network
          </Button>
        </Flex>
      </div>

      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
