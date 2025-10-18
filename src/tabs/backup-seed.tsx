/**
 * Backup Seed Phrase Page
 * Display and backup seed phrase
 */

import { useState, useEffect } from "react"
import { generateSeedPhrase, saveSeedPhrase, getSeedPhrase, hasSeedPhrase } from "~services/recovery"
import { verifyWalletPassword } from "~services/security"
import "~styles/globals.css"

function BackupSeed() {
  const [step, setStep] = useState<'password' | 'display' | 'verify' | 'complete'>('password')
  const [password, setPassword] = useState("")
  const [seedPhrase, setSeedPhrase] = useState("")
  const [words, setWords] = useState<string[]>([])
  const [verifyWords, setVerifyWords] = useState<{ [key: number]: string }>({})
  const [randomIndices, setRandomIndices] = useState<number[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  useEffect(() => {
    checkExistingSeed()
  }, [])

  const checkExistingSeed = async () => {
    const exists = await hasSeedPhrase()
    setHasExisting(exists)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        {/* Password Step */}
        {step === 'password' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔑</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {hasExisting ? 'View Seed Phrase' : 'Backup Seed Phrase'}
              </h1>
              <p className="text-gray-600">
                Enter your password to continue
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
              >
                {loading ? "Processing..." : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* Display Step */}
        {step === 'display' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📝</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Your Seed Phrase
              </h1>
              <p className="text-gray-600">
                Write down these 12 words in order and keep them safe
              </p>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ <strong>Warning:</strong> Never share your seed phrase with anyone!
                Anyone with these words can access your funds.
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
                onClick={() => setStep('verify')}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                I've Written It Down
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Store your seed phrase in a secure location,
                like a safe or safety deposit box. Consider making multiple copies.
              </p>
            </div>
          </>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Verify Seed Phrase
              </h1>
              <p className="text-gray-600">
                Enter the following words to confirm you've saved them
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
                onClick={() => setStep('display')}
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
          </>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Backup Complete!
              </h1>
              <p className="text-gray-600">
                Your seed phrase has been verified and saved securely
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <p className="text-green-800 text-center">
                ✓ Your wallet is now backed up and can be recovered using your seed phrase
              </p>
            </div>

            <button
              onClick={() => window.location.href = '/tabs/wallet.html'}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Return to Wallet
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default BackupSeed

