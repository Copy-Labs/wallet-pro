/**
 * Social Recovery Setup Component
 *
 * Allows users to set up trusted guardians for account recovery.
 * Guardians can help recover access to auth-linked accounts.
 */

import React, { useState } from "react"
import { Card, Heading, Text, TextField, Button, Flex, Badge } from "@radix-ui/themes"
import { Users, Plus, Trash2, Shield } from "lucide-react"

interface Guardian {
  id: string
  email: string
  name?: string
}

interface SocialRecoverySetupProps {
  onComplete?: (guardians: Guardian[]) => void
  onSkip?: () => void
}

export function SocialRecoverySetup({ onComplete, onSkip }: SocialRecoverySetupProps) {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [newGuardianEmail, setNewGuardianEmail] = useState("")
  const [newGuardianName, setNewGuardianName] = useState("")

  const addGuardian = () => {
    if (!newGuardianEmail.trim()) return

    const newGuardian: Guardian = {
      id: `guardian-${Date.now()}`,
      email: newGuardianEmail.trim(),
      name: newGuardianName.trim() || undefined
    }

    setGuardians(prev => [...prev, newGuardian])
    setNewGuardianEmail("")
    setNewGuardianName("")
  }

  const removeGuardian = (id: string) => {
    setGuardians(prev => prev.filter(g => g.id !== id))
  }

  const handleComplete = () => {
    if (guardians.length >= 2) {
      onComplete?.(guardians)
    }
  }

  const canComplete = guardians.length >= 2

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <Heading size="6" className="mb-2">Set Up Social Recovery</Heading>
        <Text color="gray">
          Add trusted friends or family who can help you recover your account if needed.
        </Text>
      </div>

      {/* Current Guardians */}
      {guardians.length > 0 && (
        <Card>
          <Heading size="4" className="mb-3">Your Guardians</Heading>
          <div className="space-y-3">
            {guardians.map((guardian) => (
              <Flex key={guardian.id} align="center" justify="between" className="p-3 bg-gray-50 rounded-lg">
                <div>
                  <Text className="font-medium">{guardian.name || guardian.email}</Text>
                  <Text size="2" color="gray">{guardian.email}</Text>
                </div>
                <Button
                  variant="ghost"
                  size="1"
                  color="red"
                  onClick={() => removeGuardian(guardian.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </Flex>
            ))}
          </div>
        </Card>
      )}

      {/* Add New Guardian */}
      <Card>
        <Heading size="4" className="mb-3">Add a Guardian</Heading>
        <div className="space-y-3">
          <div>
            <Text as="label" size="2" className="block mb-1">Email Address</Text>
            <TextField.Root
              type="email"
              placeholder="friend@example.com"
              value={newGuardianEmail}
              onChange={(e) => setNewGuardianEmail(e.target.value)}
            />
          </div>
          <div>
            <Text as="label" size="2" className="block mb-1">Name (Optional)</Text>
            <TextField.Root
              placeholder="John Doe"
              value={newGuardianName}
              onChange={(e) => setNewGuardianName(e.target.value)}
            />
          </div>
          <Button
            onClick={addGuardian}
            disabled={!newGuardianEmail.trim()}
            className="w-full"
          >
            <Plus size={16} className="mr-2" />
            Add Guardian
          </Button>
        </div>
      </Card>

      {/* Requirements */}
      <Card className="bg-blue-50 border-blue-200">
        <Flex align="start" gap="3">
          <Users className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <Text className="font-medium text-blue-900">Recovery Requirements</Text>
            <Text size="2" color="blue">
              You need at least 2 guardians to enable social recovery. Any 2 guardians can help you recover your account.
            </Text>
          </div>
        </Flex>
      </Card>

      {/* Progress Indicator */}
      <div className="text-center">
        <Badge color={canComplete ? "green" : "yellow"} variant="soft">
          {guardians.length}/2 Guardians Added
        </Badge>
      </div>

      {/* Action Buttons */}
      <Flex gap="3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onSkip}
        >
          Skip for Now
        </Button>
        <Button
          className="flex-1"
          disabled={!canComplete}
          onClick={handleComplete}
        >
          Complete Setup
        </Button>
      </Flex>

      <Text size="2" color="gray" className="text-center">
        You can always add or change guardians later in Settings → Security
      </Text>
    </div>
  )
}

export default SocialRecoverySetup
