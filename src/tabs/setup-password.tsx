/**
 * Password Setup Page
 * First-time password creation for wallet security
 */

import { useState } from "react"
import { validatePasswordStrength } from "~services/encryption"
import { initializeWallet } from "~services/security"
import "~/styles/globals.css"
import {CardContainer} from "~components/CardContainer";
import {PageBody, PageTabThemesContainer} from "~components/PageContainer";

function SetupPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validation = validatePasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    if (!validation.valid) {
      setError(validation.errors[0])
      return
    }

    setLoading(true)

    try {
      // Initialize wallet with password
      await initializeWallet(password)

      // Redirect to onboarding
      window.location.href = "/tabs/onboarding.html"
    } catch (err) {
      setError(err.message || "Failed to set up password")
    } finally {
      setLoading(false)
    }
  }

  const getStrengthColor = () => {
    switch (validation.strength) {
      case "strong":
        return "text-green-500"
      case "medium":
        return "text-yellow-500"
      default:
        return "text-red-500"
    }
  }

  const getStrengthText = () => {
    if (!password) return ""
    return validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1)
  }

  return (
    <PageTabThemesContainer>
      <CardContainer>
        {/*<div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">*/}
          <PageBody>
            <div className="rounded-2xl shadow-2xl p-8 w-full max-w-md">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔐</div>
                <h1 className="text-3xl font-bold mb-2">
                  Secure Your Wallet
                </h1>
                <p className="text-gray-600">
                  Create a strong password to protect your accounts
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Strength:</span>
                        <span className={`font-medium ${getStrengthColor()}`}>
                          {getStrengthText()}
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            validation.strength === "strong"
                              ? "bg-green-500 w-full"
                              : validation.strength === "medium"
                              ? "bg-yellow-500 w-2/3"
                              : "bg-red-500 w-1/3"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Confirm password"
                    required
                  />
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Password must contain:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-center">
                      <span className={password.length >= 8 ? "text-green-500" : "text-gray-400"}>
                        {password.length >= 8 ? "✓" : "○"}
                      </span>
                      <span className="ml-2">At least 8 characters</span>
                    </li>
                    <li className="flex items-center">
                      <span className={/[A-Z]/.test(password) ? "text-green-500" : "text-gray-400"}>
                        {/[A-Z]/.test(password) ? "✓" : "○"}
                      </span>
                      <span className="ml-2">One uppercase letter</span>
                    </li>
                    <li className="flex items-center">
                      <span className={/[a-z]/.test(password) ? "text-green-500" : "text-gray-400"}>
                        {/[a-z]/.test(password) ? "✓" : "○"}
                      </span>
                      <span className="ml-2">One lowercase letter</span>
                    </li>
                    <li className="flex items-center">
                      <span className={/[0-9]/.test(password) ? "text-green-500" : "text-gray-400"}>
                        {/[0-9]/.test(password) ? "✓" : "○"}
                      </span>
                      <span className="ml-2">One number</span>
                    </li>
                    <li className="flex items-center">
                      <span className={/[^A-Za-z0-9]/.test(password) ? "text-green-500" : "text-gray-400"}>
                        {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"}
                      </span>
                      <span className="ml-2">One special character</span>
                    </li>
                  </ul>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !validation.valid || password !== confirmPassword}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Setting up..." : "Create Password"}
                </button>
              </form>

              {/* Security Note */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong> Make sure to remember this password.
                  There is no way to recover it if you forget!
                </p>
              </div>
            </div>
          </PageBody>
        {/*</div>*/}
      </CardContainer>
    </PageTabThemesContainer>
  )
}

export default SetupPassword

