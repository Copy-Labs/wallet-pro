/**
 * Onboarding Page
 * Guide users through account creation and seed phrase backup
 */

import React, { useState } from "react"
import { createSmartAccount } from "~services/wallet"
import { generateSeedPhrase, saveSeedPhrase, derivePrivateKeyFromSeed, validateSeedPhrase } from "~services/recovery"
import { verifyWalletPassword } from "~services/security"
import "~styles/globals.css"
import {PageBody, PageTabThemesContainer} from "~components/PageContainer";
import {CardContainer, CardHeader} from "~components/CardContainer";
import {Callout, Heading, Text, TextField} from "@radix-ui/themes/dist/esm";
import {Button, Card, Flex} from "@radix-ui/themes";
import {LucideArrowLeft, LucideInfo, LucideXCircle} from "lucide-react";
import {clsx} from "clsx";
import SeedPhrase from "~components/tabs/SeedPhrase";
import VerifySeedPhrase from "~components/tabs/VerifySeedPhrase";
import BackupComplete from "~components/tabs/BackupComplete";

type OnboardingStep = 'welcome' | 'create-method' | 'create-account' | 'backup-prompt' | 'backup-seed' | 'verify-seed' | 'complete'

function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [accountName, setAccountName] = useState("Account 1")
  const [password, setPassword] = useState("")
  const [seedPhrase, setSeedPhrase] = useState("")
  const [words, setWords] = useState<string[]>([])
  const [verifyWords, setVerifyWords] = useState<{ [key: number]: string }>({})
  const [randomIndices, setRandomIndices] = useState<number[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [useSeedPhrase, setUseSeedPhrase] = useState(true)

  const handleWelcome = () => {
    setStep('create-method')
  }

  const handleMethodSelect = (method: 'seed' | 'random') => {
    setUseSeedPhrase(method === 'seed')
    setStep('create-account')
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Verify password
      const isValid = await verifyWalletPassword(password)
      if (!isValid) {
        setError("Incorrect password")
        setLoading(false)
        return
      }

      if (useSeedPhrase) {
        // Generate seed phrase
        const mnemonic = generateSeedPhrase()
        setSeedPhrase(mnemonic)
        setWords(mnemonic.split(' '))

        // Save seed phrase
        await saveSeedPhrase(mnemonic, password)

        // Derive first account from seed
        const privateKey = derivePrivateKeyFromSeed(mnemonic, 0)
        await createSmartAccount(accountName, privateKey)

        // Generate random indices for verification
        const indices = []
        while (indices.length < 3) {
          const rand = Math.floor(Math.random() * 12)
          if (!indices.includes(rand)) {
            indices.push(rand)
          }
        }
        setRandomIndices(indices.sort((a, b) => a - b))

        setStep('backup-prompt')
      } else {
        // Create account with random private key
        await createSmartAccount(accountName)
        setStep('complete')
      }
    } catch (err) {
      setError(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(seedPhrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVerify = () => {
    setError("")

    // Check if all words are correct
    for (const index of randomIndices) {
      if (verifyWords[index]?.toLowerCase().trim() !== words[index]) {
        setError(`Word #${index + 1} is incorrect`)
        return
      }
    }

    setStep('complete')
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
            <div className="p-2 w-full">
              {/* Welcome */}
              {step === 'welcome' && (
                <>
                  <div className="text-center mb-8">
                    {/*<div className="text-6xl mb-4">👋</div>*/}
                    <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                      Welcome to Wallet Pro!
                    </Heading>
                    <Text color={'gray'}>Let's set up your first account</Text>
                  </div>

                  <div className="space-y-4 mb-8">
                    <Card className="">
                      <Flex align={'start'} gap={'3'}>
                        <div>
                          <Heading size={'3'} className="">Secure</Heading>
                          <Text color={'gray'} size={'2'}>Your keys are encrypted and stored locally</Text>
                        </div>
                        <div className="absolute -top-4 -right-4 text-6xl grayscale opacity-5">🔐</div>
                      </Flex>
                    </Card>
                    <Card className="">
                      <Flex align={'start'} gap={'3'}>
                        <div>
                          <Heading size={'3'} className="">Fast</Heading>
                          <Text color={'gray'} size={'2'}>Account abstraction for gasless transactions</Text>
                        </div>
                        <div className="absolute -top-4 -right-4 text-6xl grayscale opacity-5">⚡</div>
                      </Flex>
                    </Card>
                    <Card className="">
                      <Flex align={'start'} gap={'3'}>
                        <div>
                          <Heading size={'3'} className="">Multi-Chain</Heading>
                          <Text color={'gray'} size={'2'}>Support for 6+ blockchain networks</Text>
                        </div>
                        <div className="absolute -top-4 -right-4 text-6xl grayscale opacity-5">🌐</div>
                      </Flex>
                    </Card>
                  </div>

                  <Button
                    className={'w-full'}
                    color={'grass'}
                    size={'3'}
                    onClick={handleWelcome}
                    // className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Get Started
                  </Button>
                </>
              )}

              {/* Create Method */}
              {step === 'create-method' && (
                <>
                  <div className="text-center mb-8">
                    {/*<div className="text-6xl mb-4">🎯</div>*/}
                    <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                      Choose Account Type
                    </Heading>
                    <Text color={'gray'}>How would you like to create your account?</Text>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-6">
                    <Card
                      className={'cursor-pointer hover:bg-[--accent-3]'}
                      onClick={() => handleMethodSelect('seed')}
                      // className="p-6 border-2 border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <Flex direction={'column'} gap={'2'} p={'2'}>
                        {/*<div className="text-4xl mb-3">🔑</div>*/}
                        <Heading className="" size={'4'}>With Seed Phrase</Heading>
                        <Text color={'gray'} size={'2'} className="mb-1">
                          Generate a 12-word seed phrase for backup and recovery
                        </Text>
                        <Text color={'jade'} size={'1'} className="" weight={'medium'}>
                          <Flex align={'center'} gap={'1'}>
                            <Text color={'jade'}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" strokeWidth={'3'} fill="green" viewBox="0 0 256 256"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path></svg>
                            </Text>
                            <Text>Recommended - Can recover wallet</Text>
                          </Flex>
                        </Text>
                      </Flex>
                    </Card>

                    <Card
                      className={'cursor-pointer hover:bg-[--gray11]'}
                      onClick={() => handleMethodSelect('random')}
                      // className="p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <Flex direction={'column'} gap={'2'} p={'2'}>
                        {/*<div className="text-4xl mb-3">⚡</div>*/}
                        <Heading className="" size={'4'}>Quick Start</Heading>
                        <Text color={'gray'} size={'2'} className="mb-1">
                          Create account instantly without seed phrase
                        </Text>
                        <Text color={'amber'} size={'1'} weight={'medium'}>
                          <Flex align={'center'} gap={'1'}>
                            <Text color={'amber'}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z" opacity="0.2"></path><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path></svg>
                            </Text>
                            <Text>Cannot recover if lost</Text>
                          </Flex>
                        </Text>
                      </Flex>
                    </Card>
                  </div>

                  <Button
                    highContrast
                    size={'3'}
                    onClick={() => setStep('welcome')}
                    // className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  >
                    <LucideArrowLeft size={14} strokeWidth={4} /> Back
                  </Button>
                </>
              )}

              {/* Create Account */}
              {step === 'create-account' && (
                <>
                  <div className="text-center mb-8">
                    {/*<div className="text-6xl mb-4">✨</div>*/}
                    <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                      Create Your Account
                    </Heading>
                    <Text color={'gray'}>
                      {useSeedPhrase ? "We'll generate a seed phrase for you" : 'Quick account creation'}
                    </Text>
                    {/*<h1 className="text-3xl font-bold text-gray-800 mb-2">
                      Create Your Account
                    </h1>
                    <p className="text-gray-600">
                      {useSeedPhrase ? 'We\'ll generate a seed phrase for you' : 'Quick account creation'}
                    </p>*/}
                  </div>

                  <form onSubmit={handleCreateAccount} className="space-y-6">
                    <div>
                      <label className={'block px-1'}>
                        <Text as={'div'} color={'gray'} mb={'1'} size={'2'} weight={'medium'}>
                          Account Name
                        </Text>
                        <TextField.Root
                          autoFocus
                          required
                          className={clsx('h-[56px]')}
                          placeholder={'My Account'}
                          size={'3'}
                          type={'text'}
                          value={accountName}
                          variant="soft"
                          onChange={(e) => setAccountName(e.target.value)}
                        />
                      </label>

                      {/*<label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="My Account"
                        required
                      />*/}
                    </div>

                    <div>
                      <label className={'block px-1'}>
                        <Text as={'div'} color={'gray'} mb={'1'} size={'2'} weight={'medium'}>
                          Confirm Password
                        </Text>
                        <TextField.Root
                          autoFocus
                          required
                          className={clsx('h-[56px]')}
                          placeholder={'Enter your wallet password'}
                          size={'3'}
                          type={'password'}
                          value={password}
                          variant="soft"
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Text color={'gray'} size={'1'} className="px-1">
                          Enter the password you created earlier
                        </Text>
                      </label>

                      {/*<label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your wallet password"
                        required
                      />*/}
                    </div>

                    {/*{error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}*/}

                    <Flex align={'center'} gap={'3'} px={'1'}>
                      <Button
                        highContrast
                        className={''}
                        size={'3'}
                        type="button"
                        onClick={() => setStep('create-method')}
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
                        {loading ? "Creating..." : "Create Account"}
                      </Button>
                    </Flex>
                  </form>
                </>
              )}

              {/* Backup Prompt */}
              {step === 'backup-prompt' && (
                <>
                  <div className="text-center mb-8">
                    {/*<div className="text-6xl mb-4">🔐</div>*/}
                    <Heading size={'7'} className="mb-2" wrap={'balance'}>
                      Backup Your Seed Phrase
                    </Heading>
                    {/*<Text color={'gray'} wrap={'pretty'}>This is the ONLY way to recover your wallet</Text>*/}
                  </div>

                  <div className="bg-red-50 border border-red-300 rounded-xl p-6 mb-6">
                    <h3 className="font-bold text-red-800 mb-3">⚠️ Kindly Note:</h3>
                    <ul className="space-y-2 text-sm text-red-700">
                      <li>• Never share your seed phrase with anyone</li>
                      <li>• Store it in a secure location (not digitally)</li>
                      <li>• Anyone with these words can access your funds</li>
                      <li>• If you lose it, you cannot recover your wallet</li>
                    </ul>
                  </div>

                  <Card hidden variant={'ghost'}>
                    <Heading color={'red'} size={'3'} className="mb-3">⚠️ Kindly Note:</Heading>
                    <ul className="space-y-2 list-disc">
                      <li><Text color={'red'} size={'1'}>Never share your seed phrase with anyone</Text></li>
                      <li><Text color={'red'} size={'1'}>Store it in a secure location (not digitally)</Text></li>
                      <li><Text color={'red'} size={'1'}>Anyone with these words can access your funds</Text></li>
                      <li><Text color={'red'} size={'1'}>If you lose it, you cannot recover your wallet</Text></li>
                    </ul>
                  </Card>

                  <Flex direction={'column'} align={'center'} justify={'center'} gap={'2'}>
                    <Button
                      highContrast
                      className={'w-full'}
                      size={'3'}
                      onClick={() => setStep('backup-seed')}
                      // className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all mb-3"
                    >
                      <Text size={'2'} weight={'bold'}>Show Seed Phrase (Recommended)</Text>
                    </Button>

                    <Button
                      className={'w-full'}
                      size={'3'}
                      variant={'soft'}
                      onClick={() => setStep('complete')}
                      // className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
                    >
                      <Text size={'2'} weight={'medium'}>Skip for Now (Not Recommended)</Text>
                    </Button>
                  </Flex>
                </>
              )}

              {/* Backup Seed */}
              {step === 'backup-seed' && (
                <SeedPhrase
                  words={words}
                  seedPhrase={seedPhrase}
                  setStep={setStep}
                />
                /*<>
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">📝</div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      Your Seed Phrase
                    </h1>
                    <p className="text-gray-600">
                      Write down these 12 words in order
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {words.map((word, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-center"
                      >
                        <span className="text-xs text-gray-500 block mb-1">#{index + 1}</span>
                        <span className="font-mono font-medium text-gray-800">{word}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={handleCopy}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                    >
                      {copied ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      onClick={() => setStep('verify-seed')}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                    >
                      I've Written It Down
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Store your seed phrase in a secure location,
                      like a safe or safety deposit box.
                    </p>
                  </div>
                </>*/
              )}

              {/* Verify Seed */}
              {step === 'verify-seed' && (
                <VerifySeedPhrase
                  randomIndices={randomIndices}
                  words={words}
                  setError={setError}
                  setStep={setStep}
                />
                /*<>
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      Verify Seed Phrase
                    </h1>
                    <p className="text-gray-600">
                      Enter the following words to confirm
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    {randomIndices.map((index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Word #{index + 1}
                        </label>
                        <input
                          type="text"
                          value={verifyWords[index] || ''}
                          onChange={(e) => setVerifyWords({ ...verifyWords, [index]: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={`Enter word #${index + 1}`}
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('backup-seed')}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerify}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                    >
                      Verify
                    </button>
                  </div>
                </>*/
              )}

              {/* Complete */}
              {step === 'complete' && (
                <BackupComplete title={"You're All Set!"} description={"Your wallet is ready to use"}>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-green-800 mb-3">✓ Setup Complete</h3>
                    <ul className="space-y-2 text-sm text-green-700">
                      <li>• Your account has been created</li>
                      {useSeedPhrase && <li>• Your seed phrase has been backed up</li>}
                      <li>• Your wallet is secured with a password</li>
                      <li>• You're ready to start using Smart Wallet Pro</li>
                    </ul>
                  </div>


                  {!useSeedPhrase && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Reminder:</strong> You created an account without a seed phrase.
                        Make sure to export a backup from settings to avoid losing access.
                      </p>
                    </div>
                  )}
                </BackupComplete>
                /*<>
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                      You're All Set!
                    </h1>
                    <p className="text-gray-600">
                      Your wallet is ready to use
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-green-800 mb-3">✓ Setup Complete</h3>
                    <ul className="space-y-2 text-sm text-green-700">
                      <li>• Your account has been created</li>
                      {useSeedPhrase && <li>• Your seed phrase has been backed up</li>}
                      <li>• Your wallet is secured with a password</li>
                      <li>• You're ready to start using Smart Wallet Pro</li>
                    </ul>
                  </div>

                  {!useSeedPhrase && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Reminder:</strong> You created an account without a seed phrase.
                        Make sure to export a backup from settings to avoid losing access.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => window.location.href = '/popup.html'}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Open Wallet
                  </button>
                </>*/
              )}
            </div>
          {/*</div>*/}
        </PageBody>
      </CardContainer>
    </PageTabThemesContainer>
  )
}

export default Onboarding

