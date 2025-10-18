import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Zap, DollarSign, CheckCircle, AlertTriangle } from "lucide-react"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import {Badge, Button, Callout, Switch} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"

import {
  getGasSponsorshipSettings,
  saveGasSponsorshipSettings,
  checkGasSponsorshipEligibility
} from "~/config/gasManager"
import { DEFAULT_GAS_MANAGER_POLICY_ID } from "~/config/gasManager"
import { toast } from "sonner"

export function SettingsGasPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    enabled: false,
    thresholdUSD: 1.0,
    policyId: DEFAULT_GAS_MANAGER_POLICY_ID
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const currentSettings = await getGasSponsorshipSettings()
      setSettings(currentSettings)
    } catch (error) {
      console.error('Failed to load gas settings:', error)
      toast.error('Failed to load gas sponsorship settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await saveGasSponsorshipSettings(settings)
      toast.success('Gas sponsorship settings saved successfully')
    } catch (error) {
      console.error('Failed to save gas settings:', error)
      toast.error('Failed to save gas sponsorship settings')
    } finally {
      setSaving(false)
    }
  }

  const testThreshold = async () => {
    try {
      const eligibility = await checkGasSponsorshipEligibility(settings.thresholdUSD.toString())
      if (eligibility.canSponsor) {
        toast.success(`Good! Transactions up to $${settings.thresholdUSD} will be sponsored`)
      } else {
        toast.warning(eligibility.reason)
      }
    } catch (error) {
      toast.error('Failed to test sponsorship eligibility')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[600px] w-[375px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    )
  }

  return (
    <div className="min-h-[600px] w-[375px] flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          size="1"
          onClick={() => navigate('/settings')}
          className="p-2 mr-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Gas Sponsorship</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <Label htmlFor="gas-enabled" className="text-base font-medium">
                  Enable Gas Sponsorship
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically pay gas fees for transactions under the threshold
              </p>
            </div>
            <Switch
              id="gas-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) =>
                setSettings(prev => ({ ...prev, enabled }))
              }
            />
          </div>

          {/* Threshold Input */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <Label className="text-base font-medium">Sponsorship Threshold</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.thresholdUSD}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    thresholdUSD: parseFloat(e.target.value) || 1.0
                  }))}
                  min="0.01"
                  step="0.1"
                  className="w-24"
                />
                <Label className="text-sm">USD per transaction</Label>
              </div>

              <Button
                variant="outline"
                size="1"
                onClick={testThreshold}
                className="w-full"
              >
                Test Threshold
              </Button>
            </div>
          </div>

          {/* Policy ID */}
          <div className="p-4 border rounded-lg space-y-3">
            <Label className="text-base font-medium">Policy ID</Label>
            <p className="text-sm text-muted-foreground">
              Alchemy Gas Manager policy identifier
            </p>
            <Input
              value={settings.policyId}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                policyId: e.target.value
              }))}
              placeholder="Enter policy ID..."
              className="font-mono text-sm"
            />
          </div>

          {/* Info Callout */}
          {settings.enabled && (
            <Callout.Root color="green" size="1">
              <Callout.Icon>
                <CheckCircle />
              </Callout.Icon>
              <Callout.Text>
                <strong>Gasless Transactions Enabled!</strong>
                <br />
                Transactions up to ${settings.thresholdUSD} will be sponsored by Alchemy Gas Manager.
              </Callout.Text>
            </Callout.Root>
          )}

          {!settings.enabled && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon>
                <AlertTriangle />
              </Callout.Icon>
              <Callout.Text>
                Gas sponsorship is disabled. Users will pay their own transaction fees.
              </Callout.Text>
            </Callout.Root>
          )}

          {/* Feature Preview */}
          <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  Gasless Experience
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  With gas sponsorship enabled, users never need to worry about ETH for gas fees.
                  Perfect for onboarding new Web3 users and creating a seamless experience.
                </p>
                <Badge color="green" variant="soft" size="1">
                  ✨ Enhanced UX
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
