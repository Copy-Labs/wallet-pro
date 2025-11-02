import React, {type ReactNode, useState} from "react"
import {
  Box,
  Button,
  Callout,
  DataList,
  Dialog,
  Flex,
  IconButton,
  Spinner,
  Text,
  TextField,
  Tooltip
} from "@radix-ui/themes"
import {Check, CheckCircleIcon, LucideX, PlusIcon, SearchIcon} from "lucide-react"
import {detectTokenMetadata, isValidContractAddress, type TokenMetadata} from "~/services/tokenDetection"
import {useUIStore} from "~/store/ui-store"
import {shortenAddress} from "~utils";

interface AddCustomTokenModalProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onAddToken: (token: CustomTokenData) => void
  isLoading?: boolean
  triggerChildren?: ReactNode
}

export interface CustomTokenData {
  address: string
  symbol: string
  decimals: number
  name?: string
}

// Step in the token import flow
type ImportStep = 'input' | 'detecting' | 'review' | 'editing'

export function AddCustomTokenModal(
  {
    isOpen,
    onOpenChange,
    onAddToken,
    isLoading = false,
    triggerChildren
  }: AddCustomTokenModalProps) {
  // Get current network info
  const selectedNetwork = useUIStore(state => state.selectedNetwork)

  // State for the multi-step flow
  const [currentStep, setCurrentStep] = useState<ImportStep>('input')
  const [contractAddress, setContractAddress] = useState('')
  const [detectedToken, setDetectedToken] = useState<TokenMetadata | null>(null)
  const [detectedError, setDetectedError] = useState<string>('')

  // Manual entry form data
  const [formData, setFormData] = useState({
    address: '',
    symbol: '',
    decimals: '',
    name: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDetecting, setIsDetecting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Form validation cache to avoid re-renders
  const [isFormValid, setIsFormValid] = useState(false)

  // Update form validation on form data changes (not on every render)
  React.useEffect(() => {
    const newErrors: Record<string, string> = {}

    const address = formData.address.trim()
    const symbol = formData.symbol.trim()
    const decimals = formData.decimals.trim()

    if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      newErrors.address = 'Invalid Ethereum address format'
    }

    if (symbol && (symbol.length < 2 || symbol.length > 10)) {
      newErrors.symbol = 'Symbol must be 2-10 characters'
    }

    const decimalsNum = decimals ? parseInt(decimals) : NaN
    if (decimals && (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18)) {
      newErrors.decimals = 'Decimals must be a number between 0 and 18'
    }

    setErrors(newErrors)
    setIsFormValid(Object.keys(newErrors).length === 0 &&
                  address.length > 0 &&
                  symbol.length > 0 &&
                  decimals.length > 0)
  }, [formData])

  // Reset to initial state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep('input')
      setContractAddress('')
      setDetectedToken(null)
      setDetectedError('')
      setFormData({ address: '', symbol: '', decimals: '', name: '' })
      setErrors({})
      setIsDetecting(false)
      setIsAdding(false)
    }
  }, [isOpen])

  // Auto-detect token when valid address is pasted (with debounce)
  React.useEffect(() => {
    if (!contractAddress.trim() || currentStep !== 'input' || isDetecting) return

    if (!isValidContractAddress(contractAddress)) return

    // Add small debounce to avoid triggering on every keystroke
    const timeoutId = setTimeout(() => {
      handleDetectToken()
    }, 800) // 800ms debounce

    return () => clearTimeout(timeoutId)
  }, [contractAddress, currentStep, isDetecting])

  // Handle token detection
  const handleDetectToken = async () => {
    if (!contractAddress.trim()) {
      setDetectedError('Please enter a contract address')
      return
    }

    if (!isValidContractAddress(contractAddress)) {
      setDetectedError('Invalid Ethereum address format')
      return
    }

    setIsDetecting(true)
    setDetectedError('')
    setDetectedToken(null)

    try {
      const result = await detectTokenMetadata(contractAddress as `0x${string}`, selectedNetwork)

      if (result.success && result.token) {
        setDetectedToken(result.token)
        setCurrentStep('review')
      } else {
        setDetectedError(result.error || 'Failed to detect token')
        setCurrentStep('editing') // Allow manual edit
      }
    } catch (error) {
      setDetectedError('Network error. Please try again.')
      setCurrentStep('editing')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleAddDetectedToken = async () => {
    if (!detectedToken) return

    setIsAdding(true)
    try {
      const tokenData: CustomTokenData = {
        address: detectedToken.address,
        symbol: detectedToken.symbol,
        decimals: detectedToken.decimals,
        name: detectedToken.name
      }

      await onAddToken(tokenData)
      handleClose()
    } catch (error) {
      setErrors({general: 'Failed to add token. Please try again.'})
    } finally {
      setIsAdding(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.address.trim()) {
      newErrors.address = 'Contract address is required'
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.address)) {
      newErrors.address = 'Invalid Ethereum address format'
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required'
    } else if (formData.symbol.length < 2 || formData.symbol.length > 10) {
      newErrors.symbol = 'Symbol must be 2-10 characters'
    }

    const decimals = parseInt(formData.decimals)
    if (!formData.decimals.trim()) {
      newErrors.decimals = 'Decimals is required'
    } else if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      newErrors.decimals = 'Decimals must be a number between 0 and 18'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      const tokenData: CustomTokenData = {
        address: formData.address.toLowerCase(),
        symbol: formData.symbol.toUpperCase(),
        decimals: parseInt(formData.decimals),
        name: formData.name.trim() || formData.symbol.toUpperCase()
      }

      await onAddToken(tokenData)

      // Reset form on success
      setFormData({address: '', symbol: '', decimals: '', name: ''})
      setErrors({})
    } catch (error) {
      setErrors({general: 'Failed to add token. Please try again.'})
    }
  }

  const handleClose = () => {
    setFormData({address: '', symbol: '', decimals: '', name: ''})
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      {triggerChildren && (
        <Dialog.Trigger>
          {triggerChildren}
        </Dialog.Trigger>
      )}
      <Dialog.Content>
        <Dialog.Title>
          {currentStep !== "review"
            ? (
              <Flex align="center" gap="2">
                Add Custom Token
              </Flex>
            )
            : <Callout.Root color="green">
              <Callout.Icon>
                <Check size={14} />
              </Callout.Icon>
              <Callout.Text>
                Please review the information below.
              </Callout.Text>
            </Callout.Root>
          }
        </Dialog.Title>

        <Box py="4">
          {/* Multi-step flow based on currentStep */}
          {currentStep === 'input' && (
            <Flex direction="column" gap="4">
              <Text size="2" color="gray">
                Paste a contract address to automatically detect token details
              </Text>

              <Box>
                <Text as="label" size="2" weight="medium">
                  Contract Address
                </Text>
                <TextField.Root
                  placeholder="0xa0b86a33e6c9dcd66ac0f6f7be8126b2afe42408"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  disabled={isDetecting}
                />

                {detectedError && (
                  <Text size="1" color="red" mt="1">{detectedError}</Text>
                )}
              </Box>

              <Flex gap="2" mt="2">
                <Button
                  onClick={handleDetectToken}
                  disabled={isDetecting || !contractAddress.trim()}
                  size="1"
                >
                  {isDetecting ? (
                    <>
                      <Spinner size="1"/>
                      Detecting...
                    </>
                  ) : (
                    <>
                      <SearchIcon size={14}/>
                      Detect Token
                    </>
                  )}
                </Button>

                <Button
                  variant="soft"
                  onClick={() => setCurrentStep('editing')}
                  size="1"
                >
                  Manual Entry
                </Button>
              </Flex>
            </Flex>
          )}

          {currentStep === 'review' && detectedToken && (
            <Flex direction="column" gap="4">
              <Callout.Root hidden color="green">
                <Callout.Icon>
                  <CheckCircleIcon size={14}/>
                </Callout.Icon>
                <Callout.Text>
                  Please review the information below.
                </Callout.Text>
              </Callout.Root>

              <Box>
                <Flex align="center" gap="3" mb="5">
                  <Flex direction={'column'} gap={'1'}>
                    <Text size="4" weight="bold">{detectedToken.name}</Text>
                    <Text
                      truncate
                      className={'w-full max-w-full'}
                      color="gray"
                      size="1"
                      trim={'both'}
                    >
                      {detectedToken.address}
                    </Text>
                  </Flex>
                </Flex>

                <Flex direction="column" gap="4">
                  <DataList.Root size="1">
                    <DataList.Item>
                      <DataList.Label minWidth="64px">Address</DataList.Label>
                      <DataList.Value>
                        <Tooltip content={detectedToken.address}>
                          <Text size="2" trim={'both'}>{shortenAddress(detectedToken.address)}</Text>
                        </Tooltip>
                      </DataList.Value>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.Label minWidth="64px">Symbol</DataList.Label>
                      <DataList.Value>
                        <Text size="2">{detectedToken.symbol}</Text>
                      </DataList.Value>
                    </DataList.Item>
                    <DataList.Item>
                      <DataList.Label minWidth="64px">Decimal</DataList.Label>
                      <DataList.Value>
                        <Text size="2">{detectedToken.decimals}</Text>
                      </DataList.Value>
                    </DataList.Item>
                  </DataList.Root>
                </Flex>

                <Button
                  variant="soft"
                  size="1"
                  mt="3"
                  onClick={() => setCurrentStep('editing')}
                >
                  Edit Details
                </Button>
              </Box>
            </Flex>
          )}

          {currentStep === 'editing' && (
            <>
              {errors.general && (
                <Callout.Root color="red" mb="4">
                  <Callout.Text>{errors.general}</Callout.Text>
                </Callout.Root>
              )}

              {detectedError && (
                <Callout.Root color="yellow" mb="4">
                  <Callout.Text>
                    Could not auto-detect token. Please fill in the details manually.
                  </Callout.Text>
                </Callout.Root>
              )}

              <Flex direction="column" gap="4">
                {/* Contract Address */}
                <Box>
                  <Text as="label" size="2" weight="medium">
                    Contract Address
                  </Text>
                  <TextField.Root
                    placeholder="0x..."
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                    disabled={isLoading}
                  />
                  {errors.address && (
                    <Text size="1" color="red" mt="1">{errors.address}</Text>
                  )}
                </Box>

                {/* Token Symbol */}
                <Box>
                  <Text as="label" size="2" weight="medium">
                    Token Symbol
                  </Text>
                  <TextField.Root
                    placeholder="USDC"
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({...prev, symbol: e.target.value.toUpperCase()}))}
                    disabled={isLoading}
                  />
                  {errors.symbol && (
                    <Text size="1" color="red" mt="1">{errors.symbol}</Text>
                  )}
                </Box>

                {/* Decimals */}
                <Box>
                  <Text as="label" size="2" weight="medium">
                    Decimals
                  </Text>
                  <TextField.Root
                    type="number"
                    placeholder="18"
                    value={formData.decimals}
                    onChange={(e) => setFormData(prev => ({...prev, decimals: e.target.value}))}
                    disabled={isLoading}
                  />
                  {errors.decimals && (
                    <Text size="1" color="red" mt="1">{errors.decimals}</Text>
                  )}
                </Box>

                {/* Token Name (Optional) */}
                <Box>
                  <Text as="label" size="2" weight="medium">
                    Token Name <Text size="1" color="gray">(Optional)</Text>
                  </Text>
                  <TextField.Root
                    placeholder="USD Coin"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    disabled={isLoading}
                  />
                </Box>
              </Flex>
            </>
          )}
        </Box>

        <Flex className={'absolute top-2 right-2'} gap="3" justify="end">
          <Dialog.Close>
            <IconButton variant="solid" color="red" radius={'full'} size={'1'}>
              <LucideX size={14} strokeWidth={3} />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {/* Dynamic footer based on current step */}
        {currentStep === 'input' && (
          <Flex hidden gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" onClick={handleClose}>
                Cancel
              </Button>
            </Dialog.Close>
          </Flex>
        )}

        {currentStep === 'review' && (
          <Flex gap="3" justify="end">
            <Button hidden variant="soft" onClick={() => setCurrentStep('input')}>
              Back
            </Button>

            <Flex gap="2">
              <Button hidden variant="soft" color="gray" onClick={() => setCurrentStep('editing')}>
                Edit Details
              </Button>

              <Button
                color="grass"
                disabled={isAdding}
                size={'1'}
                onClick={handleAddDetectedToken}
              >
                {isAdding ? (
                  <>
                    <Spinner size="1"/>
                    Adding...
                  </>
                ) : (
                  <>
                    Add Token
                  </>
                )}
              </Button>
            </Flex>
          </Flex>
        )}

        {currentStep === 'editing' && (
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" onClick={handleClose}>
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              color="grass"
              onClick={async () => {
                // Copy detected token data to form if available
                if (detectedToken) {
                  setFormData({
                    address: detectedToken.address,
                    symbol: detectedToken.symbol,
                    decimals: detectedToken.decimals.toString(),
                    name: detectedToken.name
                  })
                  // Wait for next render to validate with new form data
                  setTimeout(() => {
                    if (validateForm()) {
                      handleSubmit()
                    }
                  }, 0)
                } else {
                  await handleSubmit()
                }
              }}
              disabled={!isFormValid || isAdding}
            >
              {isAdding ? (
                <>
                  <Spinner size="1"/>
                  Adding...
                </>
              ) : (
                'Add Token'
              )}
            </Button>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
