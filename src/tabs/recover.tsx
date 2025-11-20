/**
 * Recovery Page
 * Recover wallet from seed phrase or backup file
 */

import React, { useState } from "react"
import { validateSeedPhrase, recoverFromSeedPhrase, parseBackupFile, importAccountData } from "~services/recovery"
import { initializeWallet } from "~services/security"
import { validatePasswordStrength } from "~services/encryption"
import "~styles/globals.css"
import {PageBody, PageTabThemesContainer} from "~components/PageContainer";
import {CardContainer, CardHeader} from "~components/CardContainer";
import {Callout, Flex, Heading, IconButton, Text, TextArea, TextField} from "@radix-ui/themes/dist/esm";
import {Button, Card} from "@radix-ui/themes";
import {Label} from "~components/ui/label";
import {LucideXCircle} from "lucide-react";
import {clsx} from "clsx";
import BackupComplete from "~components/tabs/BackupComplete";

type RecoveryMethod = 'seed' | 'file'

function Recover() {
  const [method, setMethod] = useState<RecoveryMethod>('seed')
  const [step, setStep] = useState<'method' | 'input' | 'password' | 'complete'>('method')
  const [seedPhrase, setSeedPhrase] = useState("")
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleMethodSelect = (selectedMethod: RecoveryMethod) => {
    setMethod(selectedMethod)
    setStep('input')
  }

  const handleSeedInput = () => {
    setError("")

    // Validate seed phrase
    const words = seedPhrase.trim().split(/\s+/)
    if (words.length !== 12) {
      setError("Seed phrase must be exactly 12 words")
      return
    }

    if (!validateSeedPhrase(seedPhrase.trim())) {
      setError("Invalid seed phrase")
      return
    }

    setStep('password')
  }

  const handleFileInput = async () => {
    setError("")

    if (!backupFile) {
      setError("Please select a backup file")
      return
    }

    setStep('password')
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Validate password strength
    const validation = validatePasswordStrength(password)
    if (!validation.valid) {
      setError(validation.errors[0])
      return
    }

    setLoading(true)

    try {
      if (method === 'seed') {
        // Initialize wallet with password
        await initializeWallet(password)

        // Recover from seed phrase
        await recoverFromSeedPhrase(seedPhrase.trim(), password)
      } else {
        // Parse backup file
        const encryptedData = await parseBackupFile(backupFile!)

        // Import account data
        await importAccountData(encryptedData, password)
      }

      setStep('complete')
    } catch (err) {
      setError(err.message || "Recovery failed")
    } finally {
      setLoading(false)
    }
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

        <PageBody>
          {/*<div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">*/}
          <div className="rounded-2xl shadow-2xl p-2 w-full max-w-2xl">
            {/* Method Selection */}
            {step === 'method' && (
              <>
                <div className="text-center mb-8">
                  {/*<div className="text-6xl mb-4">🔄</div>*/}
                  <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                    Recover Wallet
                  </Heading>
                  <Text color={'gray'}>Choose how you want to recover your wallet</Text>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Card
                    onClick={() => handleMethodSelect('seed')}
                    // className="p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <Flex align={'start'} gap={'3'}>
                      <div>
                        <Heading size={'3'} className="">Seed Phrase</Heading>
                        <Text color={'gray'} size={'2'}>Recover using your 12-word seed phrase</Text>
                      </div>
                      <div className="absolute -top-4 -right-4 text-6xl grayscale opacity-5">🔑</div>
                    </Flex>
                    {/*<div className="absolute right-0 top-0 text-4xl mb-3">🔑</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Seed Phrase
                    </h3>
                    <p className="text-sm text-gray-600">
                      Recover using your 12-word seed phrase
                    </p>*/}
                  </Card>

                  <Card
                    onClick={() => handleMethodSelect('file')}
                    // className="p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <Flex align={'start'} gap={'3'}>
                      <div>
                        <Heading size={'3'} className="">Backup File</Heading>
                        <Text color={'gray'} size={'2'}>Restore from an encrypted backup file</Text>
                      </div>
                      <div className="absolute -top-4 -right-4 text-6xl grayscale opacity-5">📁</div>
                    </Flex>
                    {/*<div className="text-4xl mb-3">📁</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      Backup File
                    </h3>
                    <p className="text-sm text-gray-600">
                      Restore from an encrypted backup file
                    </p>*/}
                  </Card>
                </div>
              </>
            )}

            {/* Seed Phrase Input */}
            {step === 'input' && method === 'seed' && (
              <>
                <div className="text-center mb-8">
                  {/*<div className="text-6xl mb-4">🔑</div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Enter Seed Phrase
                  </h1>
                  <p className="text-gray-600">
                    Enter your 12-word seed phrase
                  </p>*/}
                  <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                    Enter Seed Phrase
                  </Heading>
                  <Text color={'gray'}>Enter your 12-word seed phrase</Text>
                </div>

                <Flex direction={'column'} gap={'2'}>
                  <Label htmlFor="seedPhrase">Seed Phrase (12 words)</Label>
                  <TextArea
                    id="seedPhrase"
                    placeholder="word1 word2 word3 ..."
                    rows={4}
                    size="3"
                    value={seedPhrase}
                    variant={'soft'}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                  />
                  <Text color={'gray'} size="1" className="text-muted-foreground mt-1">
                    Enter your 12-word seed phrase, separated by spaces.
                  </Text>
                </Flex>

                <div hidden className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seed Phrase (12 words)
                  </label>
                  <textarea
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                    rows={4}
                    placeholder="word1 word2 word3 ..."
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Separate each word with a space
                  </p>
                </div>

                {/*{error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}*/}

                <Flex align={'center'} className="mt-6" gap={'2'}>
                  <Button
                    highContrast
                    size={'3'}
                    onClick={() => setStep('method')}
                    // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  >
                    Back
                  </Button>
                  <Button
                    className={'flex-1'}
                    color={'grass'}
                    size={'3'}
                    onClick={handleSeedInput}
                    // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Continue
                  </Button>
                </Flex>
              </>
            )}

            {/* File Input */}
            {step === 'input' && method === 'file' && (
              <>
                <div className="text-center mb-8">
                  <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                    Select Backup File
                  </Heading>
                  <Text color={'gray'}>Choose your encrypted backup file</Text>
                  {/*<div className="text-6xl mb-4">📁</div>*/}
                  {/*<h1 className="text-3xl font-bold text-gray-800 mb-2">*/}
                  {/*  Select Backup File*/}
                  {/*</h1>*/}
                  {/*<p className="text-gray-600">*/}
                  {/*  Choose your encrypted backup file*/}
                  {/*</p>*/}
                </div>

                {/* Warning about replacement */}
                <Card className="bg-amber3 border border-amber4 mb-6">
                  <Flex align={'center'} gap={'3'}>
                    <Text color={'amber'} className="mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path>
                      </svg>
                    </Text>
                    <div>
                      <Text color={'amber'} weight={'medium'}>Important Warning</Text>
                      <Text color={'amber'} className="mt-1" size={'2'}>
                        Importing this backup will completely replace your current wallet data.
                        Your existing accounts, transactions, and settings will be permanently lost.
                      </Text>
                    </div>
                  </Flex>
                </Card>

                <Flex className="mb-6" direction={'column'} gap={'2'}>
                  <Label htmlFor="seedPhrase">Backup File</Label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 border border-gray11 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </Flex>

                {/*<div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup File
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {backupFile && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Selected: {backupFile.name}
                    </p>
                  )}
                </div>*/}

                {/*{error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}*/}

                <Flex align={'center'} gap={'3'}>
                  <Button
                    highContrast
                    className={'flex-1'}
                    size={'3'}
                    onClick={() => setStep('method')}
                    // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  >
                    Back
                  </Button>
                  <Button
                    className={'flex-1'}
                    color={'grass'}
                    disabled={!backupFile}
                    size={'3'}
                    onClick={handleFileInput}
                    // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                  >
                    Continue
                  </Button>
                </Flex>
              </>
            )}

            {/* Password Setup */}
            {step === 'password' && (
              <>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🔐</div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {method === 'seed' ? 'Create Password' : 'Enter Password'}
                  </h1>
                  <p className="text-gray-600">
                    {method === 'seed'
                      ? 'Set a password to secure your recovered wallet'
                      : 'Enter the password used to create this backup'}
                  </p>
                </div>

                <form onSubmit={handleRecover} className="space-y-6">
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
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter password"
                      required
                    />*/}
                  </div>

                  {method === 'seed' && (
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
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Confirm password"
                        required
                      />*/}
                    </div>
                  )}

                  {/*{error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}*/}

                  <Flex align={'center'} gap={'2'}>
                    <Button
                      highContrast
                      className={'flex-1'}
                      size={'3'}
                      type="button"
                      onClick={() => setStep('input')}
                      // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                    >
                      Back
                    </Button>
                    <Button
                      className={'flex-1'}
                      color={'grass'}
                      size={'3'}
                      type="submit"
                      disabled={loading}
                      // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                    >
                      {loading ? "Recovering..." : "Recover Wallet"}
                    </Button>
                  </Flex>
                </form>
              </>
            )}

            {/* Complete */}
            {step === 'complete' && (
              <>
                <BackupComplete title={'Recovery Complete!'} description={'Your wallet has been successfully recovered'}>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <p className="text-green-800 text-center">
                      ✓ You can now access your wallet with your password
                    </p>
                  </div>
                </BackupComplete>

                {/*<div className="text-center mb-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Recovery Complete!
                  </h1>
                  <p className="text-gray-600">
                    Your wallet has been successfully recovered
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <p className="text-green-800 text-center">
                    ✓ You can now access your wallet with your password
                  </p>
                </div>

                <button
                  onClick={() => window.location.href = '/tabs/wallet.html'}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Open Wallet
                </button>*/}
              </>
            )}
          </div>
          {/*</div>*/}
        </PageBody>
      </CardContainer>
    </PageTabThemesContainer>
  )
}

export default Recover
