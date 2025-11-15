import React, {useCallback, useState} from "react"
import {useAuthenticate, useSignerStatus} from "@account-kit/react"
import {AlchemySignerStatus} from "@account-kit/signer"
import {Button, Callout, Flex, Heading, Text, TextField} from "@radix-ui/themes"
import {AlertCircle, ArrowLeft, Mail} from "lucide-react"

interface EmailOtpAuthProps {
  onSuccess?: (user: any) => void
  onError?: (error: Error) => void
  onBack?: () => void
}

export function EmailOtpAuth({ onSuccess, onError, onBack }: EmailOtpAuthProps) {
  const { authenticate } = useAuthenticate()
  const { status } = useSignerStatus()

  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  console.log("[EmailOTPAuth] Understanding status", status)

  // Handle sending OTP to email
  const handleSendOtp = useCallback(async (emailAddress: string) => {
    if (!emailAddress || !emailAddress.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    setError("")
    setOtpSent(false)

    try {
      authenticate(
        {
          type: "email",
          emailMode: "otp",
          email: emailAddress,
        },
        {
          onSuccess: (user) => {
            console.log("[EmailOtpAuth] OTP sent successfully to:", emailAddress)
            setLoading(false)
            onSuccess?.(user)
          },
          onError: (error) => {
            console.error("[EmailOtpAuth] Failed to send OTP:", error)
            setError(error.message || "Failed to send OTP. Please try again.")
            setLoading(false)
            onError?.(error)
          },
        }
      )
      setOtpSent(true)
    } catch (err: any) {
      console.error("[EmailOtpAuth] Error sending OTP:", err)
      setError(err.message || "Failed to send OTP. Please try again.")
      setLoading(false)
      onError?.(err)
    }
  }, [authenticate, onSuccess, onError])

  // Handle verifying OTP code
  const handleVerifyOtp = useCallback(async (code: string) => {
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code")
      return
    }

    setLoading(true)
    setError("")

    try {
      authenticate(
        {
          type: "otp",
          otpCode: code,
        },
        {
          onSuccess: (user) => {
            console.log("[EmailOtpAuth] OTP verified successfully")
            setLoading(false)
            onSuccess?.(user)
          },
          onError: (error) => {
            console.error("[EmailOtpAuth] Failed to verify OTP:", error)
            setError(error.message || "Invalid code. Please try again.")
            setLoading(false)
            onError?.(error)
          },
        }
      )
    } catch (err: any) {
      console.error("[EmailOtpAuth] Error verifying OTP:", err)
      setError(err.message || "Failed to verify code. Please try again.")
      setLoading(false)
      onError?.(err)
    }
  }, [authenticate, onSuccess, onError])

  // Show email input form
  if (otpSent || status === AlchemySignerStatus.AWAITING_EMAIL_AUTH) {
    return (
      <Flex direction="column" gap="4" p="4">
      <Flex align="center" gap="2">
        <Button variant="ghost" size="1" onClick={() => setOtpCode("")}>
          <ArrowLeft size={16} />
        </Button>
        <Heading size="5">Enter Verification Code</Heading>
      </Flex>

      <Text color="gray" size="2">
        We sent a 6-digit code to <strong>{email}</strong>
      </Text>

      <Flex direction="column" gap="3">
        <TextField.Root
          type="text"
          placeholder="123456"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          size="3"
          // disabled={loading}
          maxLength={6}
          style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }}
        />

        {error && (
          <Callout.Root size="1" color="red">
            <Callout.Icon>
              <AlertCircle size={16} />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Button
          color={'grass'}
          size="3"
          onClick={() => handleVerifyOtp(otpCode)}
          disabled={otpCode.length !== 6}
          style={{ width: "100%" }}
        >
          {loading ? "Verifying..." : "Verify Code"}
        </Button>

        <Button
          variant="ghost"
          size="2"
          onClick={() => handleSendOtp(email)}
          // disabled={loading}
        >
          Didn't receive code? Resend
        </Button>
      </Flex>
    </Flex>

    )
  }

  // Show OTP verification form
  return (
    <Flex direction="column" gap="4" p="4">
    <Flex align="center" gap="2">
      {onBack && (
        <Button variant="ghost" size="1" onClick={onBack}>
          <ArrowLeft size={16} />
        </Button>
      )}
      <Heading size="5">Sign in with Email</Heading>
    </Flex>

    <Text color="gray" size="2">
      Enter your email address to receive a one-time password
    </Text>

    <Flex direction="column" gap="3">
      <TextField.Root
        type="email"
        placeholder="Enter your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        size="3"
        disabled={otpSent}
      />

      {error && (
        <Callout.Root size="1" color="red">
          <Callout.Icon>
            <AlertCircle size={16} />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Button
        highContrast
        size="3"
        onClick={() => handleSendOtp(email)}
        disabled={otpSent || !email.trim()}
        style={{ width: "100%" }}
      >
        <Flex align="center" gap="2">
          <Mail size={16} />
          {otpSent ? "Sending..." : "Send Codes"}
        </Flex>
      </Button>
    </Flex>
  </Flex>
  )
}
