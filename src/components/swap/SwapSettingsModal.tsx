import React, { useState } from "react"
import { Dialog, Flex, Text, Button, TextField, Card, Badge, Separator } from "@radix-ui/themes"
import { SettingsIcon, AlertTriangleIcon } from "lucide-react"

interface SwapSettings {
  slippageTolerance: number
  transactionDeadline: number // in minutes
  maxPriceImpact: number
}

interface SwapSettingsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  settings: SwapSettings
  onSettingsChange: (settings: SwapSettings) => void
  estimatedPriceImpact?: number
}

const DEFAULT_SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 2.0] // percentages

export function SwapSettingsModal({
  isOpen,
  onOpenChange,
  settings,
  onSettingsChange,
  estimatedPriceImpact = 0
}: SwapSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<SwapSettings>(settings)

  const handleSave = () => {
    onSettingsChange(localSettings)
    onOpenChange(false)
  }

  const handleSlippagePreset = (preset: number) => {
    setLocalSettings(prev => ({ ...prev, slippageTolerance: preset }))
  }

  const getSlippageWarning = (slippage: number) => {
    if (slippage >= 5) return { level: 'high', message: 'Very high slippage. Transaction may fail.' }
    if (slippage >= 2) return { level: 'medium', message: 'High slippage. Consider lower tolerance.' }
    return null
  }

  const getPriceImpactWarning = (impact: number) => {
    if (impact >= 10) return { level: 'high', message: 'Very high price impact. Consider smaller trade.' }
    if (impact >= 5) return { level: 'medium', message: 'High price impact. Trade may be unfavorable.' }
    return null
  }

  const slippageWarning = getSlippageWarning(localSettings.slippageTolerance)
  const priceImpactWarning = getPriceImpactWarning(estimatedPriceImpact)

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Swap Settings</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Customize your swap preferences for better control over transactions.
        </Dialog.Description>

        <Flex direction="column" gap="4">
          {/* Slippage Tolerance */}
          <Card>
            <Flex direction="column" gap="3" p="3">
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">Slippage Tolerance</Text>
                <Text size="2" color="gray">
                  {localSettings.slippageTolerance}%
                </Text>
              </Flex>

              <Text size="2" color="gray">
                Your transaction will revert if the price changes unfavorably by more than this percentage.
              </Text>

              {/* Preset Buttons */}
              <Flex gap="2" wrap="wrap">
                {DEFAULT_SLIPPAGE_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    size="1"
                    variant={localSettings.slippageTolerance === preset ? "solid" : "soft"}
                    onClick={() => handleSlippagePreset(preset)}
                  >
                    {preset}%
                  </Button>
                ))}
              </Flex>

              {/* Custom Slippage Input */}
              <TextField.Root
                type="number"
                placeholder="Custom slippage"
                value={localSettings.slippageTolerance}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value) && value >= 0 && value <= 50) {
                    setLocalSettings(prev => ({ ...prev, slippageTolerance: value }))
                  }
                }}
                size="2"
              >
                <TextField.Slot>%</TextField.Slot>
              </TextField.Root>

              {/* Slippage Warning */}
              {slippageWarning && (
                <Flex gap="2" align="center" p="2" className="bg-amber-50 border border-amber-200 rounded">
                  <AlertTriangleIcon size={16} className="text-amber-600" />
                  <Text size="2" color="amber">
                    {slippageWarning.message}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>

          {/* Transaction Deadline */}
          <Card>
            <Flex direction="column" gap="3" p="3">
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">Transaction Deadline</Text>
                <Text size="2" color="gray">
                  {localSettings.transactionDeadline} min
                </Text>
              </Flex>

              <Text size="2" color="gray">
                Your transaction will revert if it takes longer than this to confirm.
              </Text>

              <TextField.Root
                type="number"
                placeholder="Deadline in minutes"
                value={localSettings.transactionDeadline}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value) && value >= 1 && value <= 60) {
                    setLocalSettings(prev => ({ ...prev, transactionDeadline: value }))
                  }
                }}
                size="2"
              >
                <TextField.Slot>min</TextField.Slot>
              </TextField.Root>
            </Flex>
          </Card>

          {/* Price Impact Warning */}
          {estimatedPriceImpact > 0 && (
            <Card>
              <Flex direction="column" gap="2" p="3">
                <Flex justify="between" align="center">
                  <Text size="3" weight="bold">Estimated Price Impact</Text>
                  <Badge color={estimatedPriceImpact >= 5 ? "red" : estimatedPriceImpact >= 2 ? "amber" : "green"}>
                    {estimatedPriceImpact.toFixed(2)}%
                  </Badge>
                </Flex>

                <Text size="2" color="gray">
                  The difference between the current market price and your execution price.
                </Text>

                {priceImpactWarning && (
                  <Flex gap="2" align="center" p="2" className="bg-red-50 border border-red-200 rounded">
                    <AlertTriangleIcon size={16} className="text-red-600" />
                    <Text size="2" color="red">
                      {priceImpactWarning.message}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </Card>
          )}

          {/* Max Price Impact Setting */}
          <Card>
            <Flex direction="column" gap="3" p="3">
              <Flex justify="between" align="center">
                <Text size="3" weight="bold">Max Price Impact</Text>
                <Text size="2" color="gray">
                  {localSettings.maxPriceImpact}%
                </Text>
              </Flex>

              <Text size="2" color="gray">
                Block swaps with price impact higher than this threshold.
              </Text>

              <TextField.Root
                type="number"
                placeholder="Max price impact"
                value={localSettings.maxPriceImpact}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  if (!isNaN(value) && value >= 0 && value <= 50) {
                    setLocalSettings(prev => ({ ...prev, maxPriceImpact: value }))
                  }
                }}
                size="2"
              >
                <TextField.Slot>%</TextField.Slot>
              </TextField.Root>
            </Flex>
          </Card>
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button variant="soft">Cancel</Button>
          </Dialog.Close>
          <Button onClick={handleSave}>Save Settings</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
