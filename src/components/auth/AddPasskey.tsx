import React, { useState } from "react"
import { useAddPasskey } from "@account-kit/react"
import { Button, Callout, Flex, Text } from "@radix-ui/themes"
import { AlertCircle, Key, Plus } from "lucide-react"

interface AddPasskeyProps {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function AddPasskey({ onSuccess, onError }: AddPasskeyProps) {
  const { addPasskey, isAddingPasskey } = useAddPasskey()
  const [error, setError] = useState("")

  const handleAddPasskey = async () => {
    setError("")

    try {
      await addPasskey()
      onSuccess?.()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to add passkey. Please try again."
      setError(errorMessage)
      onError?.(err)
    }
  }

  return (
    <Flex direction="column" gap="3">
      <Text size="2" color="gray">
        Add a passkey for faster, more secure sign-in to your wallet.
      </Text>

      {error && (
        <Callout.Root size="1" color="red">
          <Callout.Icon>
            <AlertCircle size={16} />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Button
        onClick={handleAddPasskey}
        disabled={isAddingPasskey}
        highContrast
        size="3"
        style={{ width: "100%" }}
      >
        <Flex align="center" gap="2">
          {isAddingPasskey ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <Text>Adding Passkey...</Text>
            </>
          ) : (
            <>
              <Plus size={16} />
              <Text>Add Passkey</Text>
            </>
          )}
        </Flex>
      </Button>
    </Flex>
  )
}

// Export a simpler version for use in settings
export function AddPasskeyButton({ onSuccess, onError }: AddPasskeyProps) {
  const { addPasskey, isAddingPasskey } = useAddPasskey()
  const [error, setError] = useState("")

  const handleAddPasskey = async () => {
    setError("")

    try {
      await addPasskey()
      onSuccess?.()
    } catch (err: any) {
      const errorMessage = err.message || "Failed to add passkey. Please try again."
      setError(errorMessage)
      onError?.(err)
    }
  }

  return (
    <Flex direction="column" gap="2">
      <Button
        onClick={handleAddPasskey}
        disabled={isAddingPasskey}
        variant="surface"
        className="w-full justify-start"
      >
        <Flex align="center" justify="start" gap="4">
          <Key className="w-4 h-4" />
          <Flex direction="column" align="start" justify="center">
            <Text size="2">Add Passkey</Text>
            <Text size="1" color="gray">
              Enable biometric authentication
            </Text>
          </Flex>
        </Flex>
      </Button>

      {error && (
        <Callout.Root size="1" color="red">
          <Callout.Icon>
            <AlertCircle size={16} />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
    </Flex>
  )
}
