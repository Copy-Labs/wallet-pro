/**
 * Recovery Page
 * Recover wallet from seed phrase or backup file
 */

import { useState } from "react"
import { validateSeedPhrase, recoverFromSeedPhrase, parseBackupFile, importAccountData } from "~services/recovery"
import { initializeWallet } from "~services/security"
import { validatePasswordStrength } from "~services/encryption"
import "~styles/globals.css"

type RecoveryMethod = 'seed' | 'file'

function Recover() {
  const [method, setMethod] = useState<RecoveryMethod>('seed')
  const [step, setStep] = useState<'method' | 'input' | 'password' | 'complete'>('method')
  const [seedPhrase, setSeedPhrase] = useState("")
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        {/* Method Selection */}
        {step === 'method' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔄</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Recover Wallet
              </h1>
              <p className="text-gray-600">
                Choose how you want to recover your wallet
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleMethodSelect('seed')}
                className="p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <div className="text-4xl mb-3">🔑</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Seed Phrase
                </h3>
                <p className="text-sm text-gray-600">
                  Recover using your 12-word seed phrase
                </p>
              </button>

              <button
                onClick={() => handleMethodSelect('file')}
                className="p-6 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <div className="text-4xl mb-3">📁</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Backup File
                </h3>
                <p className="text-sm text-gray-600">
                  Restore from an encrypted backup file
                </p>
              </button>
            </div>
          </>
        )}

        {/* Seed Phrase Input */}
        {step === 'input' && method === 'seed' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔑</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Enter Seed Phrase
              </h1>
              <p className="text-gray-600">
                Enter your 12-word seed phrase
              </p>
            </div>

            <div className="mb-6">
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('method')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSeedInput}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {/* File Input */}
        {step === 'input' && method === 'file' && (
          <>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📁</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Select Backup File
              </h1>
              <p className="text-gray-600">
                Choose your encrypted backup file
              </p>
            </div>

            <div className="mb-6">
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
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('method')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleFileInput}
                disabled={!backupFile}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
              >
                Continue
              </button>
            </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                />
              </div>

              {method === 'seed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
                >
                  {loading ? "Recovering..." : "Recover Wallet"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <>
            <div className="text-center mb-8">
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
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Recover

