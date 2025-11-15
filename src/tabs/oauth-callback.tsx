/**
 * OAuth Callback Handler for Smart Wallet Pro
 *
 * This page handles OAuth authentication callbacks from social providers
 * (Google, GitHub, etc.) in the browser extension context.
 */

import React, { useEffect, useState } from "react"
import { completeRedirectSignIn } from "~services/auth"
import { useNavigate } from "react-router-dom"
import { Card, Heading, Text, Spinner } from "@radix-ui/themes"

function OAuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Processing authentication...")

  useEffect(() => {
    handleOAuthCallback()
  }, [])

  const handleOAuthCallback = async () => {
    try {
      // Get OAuth parameters from URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      const state = urlParams.get("state")
      const error = urlParams.get("error")

      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code) {
        throw new Error("No authorization code received")
      }

      // Here you would typically exchange the code for tokens
      // For now, we'll create a mock user based on the OAuth flow
      const mockUser = {
        userId: `oauth-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        email: "user@example.com", // Would come from OAuth provider
        provider: "google", // Would be determined from the OAuth flow
        sessionToken: `oauth-token-${Date.now()}`,
        expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
      }

      // Complete the authentication
      await completeRedirectSignIn(mockUser)

      setStatus("success")
      setMessage("Authentication successful! Redirecting...")

      // Close this tab and notify the parent window
      setTimeout(() => {
        // Try to close the tab
        if (window.opener) {
          // Notify parent window
          window.opener.postMessage({
            type: "OAUTH_SUCCESS",
            user: mockUser
          }, "*")
        }

        // Close this tab
        window.close()

        // Fallback: redirect to main app
        navigate("/")
      }, 2000)

    } catch (err) {
      console.error("OAuth callback error:", err)
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Authentication failed")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center p-6">
          {status === "loading" && (
            <>
              <Spinner size="3" className="mb-4" />
              <Heading size="4" className="mb-2">Authenticating...</Heading>
              <Text color="gray">{message}</Text>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-green-500 text-4xl mb-4">✓</div>
              <Heading size="4" className="mb-2">Success!</Heading>
              <Text color="gray">{message}</Text>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-red-500 text-4xl mb-4">✕</div>
              <Heading size="4" className="mb-2">Authentication Failed</Heading>
              <Text color="gray">{message}</Text>
              <button
                onClick={() => window.close()}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Close
              </button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export default OAuthCallback
