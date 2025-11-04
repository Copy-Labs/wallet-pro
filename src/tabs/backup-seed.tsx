/**
 * Backup Seed Phrase Page
 * Display and backup seed phrase
 */

import React, { useState, useEffect } from "react"
import { generateSeedPhrase, saveSeedPhrase, getSeedPhrase, hasSeedPhrase } from "~services/recovery"
import { verifyWalletPassword } from "~services/security"
import "~styles/globals.css"
import {CardContainer, CardHeader} from "~components/CardContainer";
import {PageBody, PageTabThemesContainer} from "~components/PageContainer";
import {
  AlertDialog,
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  Heading,
  Spinner,
  Strong,
  Text,
  TextField
} from "@radix-ui/themes";
import {clsx} from "clsx";
import {MINIMUM_PASSWORD_LENGTH} from "~config/constant";
import {LucideInfo, LucideTriangleAlert, LucideX, LucideXCircle} from "lucide-react";
import {Dialog, IconButton} from "@radix-ui/themes/dist/esm";

function ExplainSeedPhrase() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button
          color={'grass'}
          radius={'full'}
          variant={'soft'}
        >
          <Text>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M144,176a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128ZM124,96a12,12,0,1,0-12-12A12,12,0,0,0,124,96Z"></path></svg>
          </Text>
          What is a Seed Phrase ?
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>What is a Seed Phrase?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          <ol className={'list-decimal space-y-4 px-4'}>
            <li>
              It is a series of 12 or 24 words that acts as a master key to your wallet.
            </li>
            <li>
              Anyone with access can use it to recover access to your funds ANYDAY, ANYTIME.
            </li>
            <li>
              <Strong>STORE IT SECURELY</Strong>
            </li>
            <li>
              <strong>Warning:</strong> Never share your seed phrase with anyone!
            </li>
          </ol>
        </AlertDialog.Description>

        <Flex className={'absolute top-2 right-2'} gap="3" justify="end">
          <AlertDialog.Cancel>
            <IconButton variant="solid" color="red" radius={'full'} size={'1'}>
              <LucideX size={14} strokeWidth={3} />
            </IconButton>
          </AlertDialog.Cancel>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>

  )
}

function BackupSeed() {
  const [step, setStep] = useState<'password' | 'display' | 'verify' | 'complete'>('password')
  const [password, setPassword] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [seedPhrase, setSeedPhrase] = useState("")
  const [words, setWords] = useState<string[]>([])
  const [verifyWords, setVerifyWords] = useState<{ [key: number]: string }>({})
  const [randomIndices, setRandomIndices] = useState<number[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)
  const [agreedNeverShare, setAgreedNeverShare] = useState(false)
  const [agreedAnyoneAccess, setAgreedAnyoneAccess] = useState(false)

  useEffect(() => {
    checkExistingSeed()
  }, [])

  // Check lockout timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setAttempts(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [lockoutTime])

  const checkExistingSeed = async () => {
    const exists = await hasSeedPhrase()
    setHasExisting(exists)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Check if locked out
    if (lockoutTime > 0) {
      setError(`Too many attempts. Try again in ${lockoutTime} seconds`)
      return
    }

    setLoading(true)

    try {
      // Verify password
      const isValid = await verifyWalletPassword(password)
      if (!isValid) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        // Lockout after 5 failed attempts
        if (newAttempts >= 5) {
          setLockoutTime(60) // 60 second lockout
          setError("Too many failed attempts. Locked for 60 seconds")
        } else {
          setError("Incorrect password")
        }

        setLoading(false)
        return
      }

      // Check if seed phrase already exists
      if (hasExisting) {
        // Retrieve existing seed phrase
        const existing = await getSeedPhrase(password)
        setSeedPhrase(existing)
        setWords(existing.split(' '))
      } else {
        // Generate new seed phrase
        const newSeed = generateSeedPhrase()
        setSeedPhrase(newSeed)
        setWords(newSeed.split(' '))

        // Save it
        await saveSeedPhrase(newSeed, password)
      }

      // Generate random indices for verification
      const indices = []
      while (indices.length < 3) {
        const rand = Math.floor(Math.random() * 12)
        if (!indices.includes(rand)) {
          indices.push(rand)
        }
      }
      setRandomIndices(indices.sort((a, b) => a - b))

      setStep('display')
    } catch (err) {
      setError(err.message || "Failed to process seed phrase")
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
          {/* Attempts Warning */}
          {attempts > 0 && attempts < 5 && (
            <Callout.Root size={'1'} color="amber" className={'mt-2'}>
              <Callout.Icon>
                <LucideInfo />
              </Callout.Icon>
              <Callout.Text align={'center'}>
                {5 - attempts} attempt{5 - attempts !== 1 ? "s" : ""} remaining
              </Callout.Text>
            </Callout.Root>
          )}
        </CardHeader>

        <PageBody>
          {/*<div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">*/}
          <div className="rounded-2xl shadow-2xl p-2 w-full">
            {/* Password Step */}
            {step === 'password' && (
              <>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🔑</div>
                  <Heading size={'8'} className="mb-2" wrap={'pretty'}>
                    {hasExisting ? 'View Seed Phrase' : 'Backup Seed Phrase'}
                  </Heading>
                  <Text color={'gray'}>Enter your password to continue</Text>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <label className={'px-1'}>
                    <Text as={'div'} color={'gray'} mb={'1'} size={'2'} weight={'medium'}>
                      Password
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
                    {/*<input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                      autoFocus
                    />*/}
                  </label>

                  {/*{error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}*/}

                  {/*<button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                  >
                    {loading ? "Processing..." : "Continue"}
                  </button>*/}

                  <Button
                    highContrast
                    disabled={
                      loading
                      || (!password.trim() && password.trim().length < MINIMUM_PASSWORD_LENGTH / 2)
                      || lockoutTime > 0
                    }
                    size={'3'}
                    type="submit"
                    className={'w-full h-12'}
                  >
                    <Spinner loading={loading} />
                    {lockoutTime > 0
                      ? `Locked (${lockoutTime}s)`
                      : loading
                        ? "Processing..."
                        : "Proceed"}
                  </Button>
                </form>
              </>
            )}

            {/* Display Step */}
            {step === 'display' && (
              <Flex direction={'column'} gap={'6'}>
                <div className="text-center">
                  {/*<div className="text-6xl mb-4">📝</div>*/}
                  <Heading size={'7'} className="mb-2" wrap={'pretty'}>
                    Your Seed Phrase
                  </Heading>

                  <ExplainSeedPhrase /> <br />

                  <Text hidden size={'2'} color={'gray'}>
                    Write down these 12 words in the order they are displayed and keep them safe
                  </Text>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {words.map((word, index) => (
                    <Card
                      className="h-12 py-1"
                      key={index}
                      variant={'classic'}
                    >
                      <Flex direction={'column'}>
                        <Text color={'gray'} size={'1'} className="">{index + 1}.</Text>
                        <Text size={'2'} className="font-mon" weight={'medium'}>{word}</Text>
                      </Flex>
                    </Card>
                  ))}
                </div>

                <div hidden className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ <strong>Warning:</strong> Never share your seed phrase with anyone!
                    Anyone with these words can access your funds.
                  </p>
                </div>

                <Flex direction={'column'} gap={'2'}>
                  <Text as="label" size="2">
                    <Flex gap="2">
                      <Checkbox
                        color={'grass'}
                        checked={agreedNeverShare}
                        size={'1'}
                        onCheckedChange={(checked) => setAgreedNeverShare(checked === true)}
                      />
                      I will never share your seed phrase with anyone.
                    </Flex>
                  </Text>

                  <Text as="label" size="2">
                    <Flex gap="2">
                      <Checkbox
                        color={'grass'}
                        checked={agreedAnyoneAccess}
                        size={'1'}
                        onCheckedChange={(checked) => setAgreedAnyoneAccess(checked === true)}
                      />
                      I agree that anyone with these words can access my funds.
                    </Flex>
                  </Text>
                </Flex>

                <Flex align={'center'} className="" gap={'3'}>
                  <Button
                    highContrast
                    className={'flex-1'}
                    size={'2'}
                    onClick={handleCopy}
                    // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  >
                    {
                      copied
                      ? <Flex justify={"between"} align={"center"} gap={"2"}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="green" viewBox="0 0 256 256"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path></svg>
                          Copied
                        </Flex>
                      : <Flex justify={"between"} align={"center"} gap={"2"}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40V168H168V88H88V40Z" opacity="0.2"></path><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path></svg>
                          Copy
                        </Flex>
                    }
                  </Button>
                  <Button
                    color={'grass'}
                    size={'2'}
                    disabled={!agreedNeverShare || !agreedAnyoneAccess}
                    // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                    onClick={() => setStep('verify')}
                  >
                    I've Written It Down
                  </Button>
                </Flex>

                <div hidden className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Store your seed phrase in a secure location,
                    like a safe or safety deposit box. Consider making multiple copies.
                  </p>
                </div>
              </Flex>
            )}

            {/* Verify Step */}
            {step === 'verify' && (
              <>
                <div className="text-center mb-8 space-y-2">
                  {/*<div className="text-6xl mb-4">✅</div>*/}
                  <Heading size={'7'} className="" wrap={'pretty'}>
                    Verification Phase
                  </Heading>

                  <Text size={'2'} color={'gray'}>
                    Confirm you have saved your Seed phrase
                  </Text>

                  <ExplainSeedPhrase />
                </div>

                <div className="space-y-6 mb-6">
                  {randomIndices.map((index) => (
                    <div key={index} className={''}>
                      <label className={'px-1 block'}>
                        <Text as="div" size="2" mb="1" weight="bold">
                          Word #{index + 1}
                        </Text>
                        <TextField.Root
                          autoFocus
                          autoComplete="off"
                          required
                          className={'h-[56px]'}
                          placeholder={`Enter word #${index + 1}`}
                          size={'3'}
                          type={'text'}
                          value={verifyWords[index] || ''}
                          variant="soft"
                          onChange={(e) => setVerifyWords({ ...verifyWords, [index]: e.target.value })}
                        />
                      </label>
                      {/*<input
                        type="text"
                        value={verifyWords[index] || ''}
                        onChange={(e) => setVerifyWords({ ...verifyWords, [index]: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder={`Enter word #${index + 1}`}
                        autoComplete="off"
                      />*/}
                    </div>
                  ))}
                </div>

                {/*{error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}*/}

                <div className="flex gap-3">
                  <Button
                    highContrast
                    className={'flex-1'}
                    size={'2'}
                    onClick={() => setStep('display')}
                    // className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                  >
                    Back
                  </Button>
                  <Button
                    className={'flex-1'}
                    color={'grass'}
                    disabled={!randomIndices.every(index => verifyWords[index]?.trim())}
                    onClick={handleVerify}
                    // className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Verify
                  </Button>
                </div>
              </>
            )}

            {/* Complete Step */}
            {step === 'complete' && (
              <>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <Heading size={'7'} className="" wrap={'pretty'}>
                    Backup Complete
                  </Heading>

                  <Text size={'2'} color={'gray'}>
                    Your seed phrase has been verified and saved securely
                  </Text>
                </div>

                {/*<Card
                  // className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6"
                  variant={'surface'}
                >
                  <Text
                    // className="text-green-800 text-center"
                  >
                    Your wallet is now backed up and can be recovered using your seed phrase
                  </Text>
                </Card>*/}

                <Button
                  highContrast
                  className={'w-full'}
                  size={'3'}
                  onClick={() => window.location.href = '/popup.html'}
                  // className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Return to Wallet
                </Button>
              </>
            )}
          </div>
          {/*</div>*/}
        </PageBody>
      </CardContainer>
    </PageTabThemesContainer>
  )
}

export default BackupSeed
