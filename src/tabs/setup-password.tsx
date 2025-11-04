/**
 * Password Setup Page
 * First-time password creation for wallet security
 */

import React, { useState } from "react"
import { validatePasswordStrength } from "~services/encryption"
import { initializeWallet } from "~services/security"
import "~/styles/globals.css"
import {CardContainer, CardHeader} from "~components/CardContainer";
import {PageBody, PageTabThemesContainer} from "~components/PageContainer";
import {Callout, Heading, Text, TextField} from "@radix-ui/themes/dist/esm";
import {clsx} from "clsx";
import {Button, Card, Flex, IconButton} from "@radix-ui/themes";
import {LucideInfo, LucideXCircle} from "lucide-react";

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
        <CardHeader center showBackButton={false}>
          {error && (
            <Callout.Root size={'1'} color="red">
              <Callout.Icon>
                <LucideXCircle />
              </Callout.Icon>
              <Callout.Text align={'center'}>{error}</Callout.Text>
            </Callout.Root>
          )}
        </CardHeader>

        {/*<div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">*/}
          <PageBody>
            <div className="rounded-2xl shadow-2xl p-4 w-full max-w-md">
              <div className="text-center mb-8">
                {/*<div className="text-5xl mb-4">🔐</div>*/}
                <Flex align={'center'} justify={'center'} py={'3'}>
                  <Text align={'center'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 256 256"><path d="M216,96V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H208A8,8,0,0,1,216,96Z" opacity="0.2"></path><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"></path></svg>
                  </Text>
                </Flex>
                <Heading size={'8'} className="mb-2" wrap={'pretty'}>
                  Secure Your Wallet
                </Heading>
                <Text hidden color={'gray'}>
                  Create a strong password to protect your accounts
                </Text>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Password Input */}
                <div>
                  <label className={'block px-1'}>
                    <Text as={'div'} color={'gray'} mb={'1'} size={'2'} weight={'medium'}>
                      Password
                    </Text>
                    <div className={'relative'}>
                      <TextField.Root
                        autoFocus
                        required
                        className={clsx('h-[56px]')}
                        placeholder={'Enter your wallet password'}
                        size={'3'}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        variant="soft"
                        onChange={(e) => setPassword(e.target.value)}
                      >
                        <TextField.Slot></TextField.Slot>
                        <TextField.Slot>
                          <IconButton
                            tabIndex={-1}
                            type={'button'}
                            variant={'ghost'}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {
                              showPassword
                                ? <Text color={'gray'}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,112a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z" opacity="0.2"></path><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path></svg>
                                </Text>
                                : <Text>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,104c-16.81,20.81-47.63,48-96,48s-79.19-27.19-96-48c16.81-20.81,47.63-48,96-48S207.19,83.19,224,104Z" opacity="0.2"></path><path d="M228,175a8,8,0,0,1-10.92-3l-19-33.2A123.23,123.23,0,0,1,162,155.46l5.87,35.22a8,8,0,0,1-6.58,9.21A8.4,8.4,0,0,1,160,200a8,8,0,0,1-7.88-6.69l-5.77-34.58a133.06,133.06,0,0,1-36.68,0l-5.77,34.58A8,8,0,0,1,96,200a8.4,8.4,0,0,1-1.32-.11,8,8,0,0,1-6.58-9.21L94,155.46a123.23,123.23,0,0,1-36.06-16.69L39,172A8,8,0,1,1,25.06,164l20-35a153.47,153.47,0,0,1-19.3-20A8,8,0,1,1,38.22,99c16.6,20.54,45.64,45,89.78,45s73.18-24.49,89.78-45A8,8,0,1,1,230.22,109a153.47,153.47,0,0,1-19.3,20l20,35A8,8,0,0,1,228,175Z"></path></svg>
                                </Text>
                            }
                          </IconButton>
                        </TextField.Slot>
                      </TextField.Root>
                    </div>
                  </label>

                  {/*<label className="block text-sm font-medium text-gray-700 mb-2">
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
                  </div>*/}

                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <Text color={'gray'}>Strength:</Text>
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
                  <label className={'block px-1'}>
                    <Text as={'div'} color={'gray'} mb={'1'} size={'2'} weight={'medium'}>
                      Confirm Password
                    </Text>
                    <div>
                      <TextField.Root
                        required
                        className={clsx('h-[56px]')}
                        placeholder={'Confirm password'}
                        size={'3'}
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        variant="soft"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      >
                        <TextField.Slot></TextField.Slot>
                      </TextField.Root>
                    </div>
                  </label>
                  {/*<label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Confirm password"
                    required
                  />*/}
                </div>

                {/* Password Requirements */}
                {
                  password &&
                  <Card className={'px-4'} variant={'ghost'}>
                    <Text className="text-sm font-medium mb-2">
                      Password must contain:
                    </Text>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center">
                        <span className={password.length >= 8 ? "text-green-500" : "text-gray-400"}>
                          {password.length >= 8 ? "✓" : "○"}
                        </span>
                        <Text color={'gray'} size={'2'} className="ml-2">At least 8 characters</Text>
                      </li>
                      <li className="flex items-center">
                        <span className={/[A-Z]/.test(password) ? "text-green-500" : "text-gray-400"}>
                          {/[A-Z]/.test(password) ? "✓" : "○"}
                        </span>
                        <Text color={'gray'} size={'2'} className="ml-2">One uppercase letter</Text>
                      </li>
                      <li className="flex items-center">
                        <span className={/[a-z]/.test(password) ? "text-green-500" : "text-gray-400"}>
                          {/[a-z]/.test(password) ? "✓" : "○"}
                        </span>
                        <Text color={'gray'} size={'2'} className="ml-2">One lowercase letter</Text>
                      </li>
                      <li className="flex items-center">
                        <span className={/[0-9]/.test(password) ? "text-green-500" : "text-gray-400"}>
                          {/[0-9]/.test(password) ? "✓" : "○"}
                        </span>
                        <Text color={'gray'} size={'2'} className="ml-2">One number</Text>
                      </li>
                      <li className="flex items-center">
                        <span className={/[^A-Za-z0-9]/.test(password) ? "text-green-500" : "text-gray-400"}>
                          {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"}
                        </span>
                        <Text color={'gray'} size={'2'} className="ml-2">One special character</Text>
                      </li>
                    </ul>
                  </Card>
                }

                {/* Error Message */}
                {/*{error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}*/}

                {/* Submit Button */}
                <Button
                  highContrast
                  className={'w-full'}
                  size={'3'}
                  type="submit"
                  disabled={loading || !validation.valid || password !== confirmPassword}
                  // className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Setting up..." : "Create Password"}
                </Button>
              </form>

              {/* Security Note */}
              <div hidden className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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

