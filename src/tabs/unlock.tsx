/**
 * Unlock Screen
 * Password entry to unlock wallet
 */

import {useEffect, useState} from "react"
import {unlockWallet} from "~services/security"
import "~/styles/globals.css"
import {CardContainer} from "~components/CardContainer";


interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const isTab = false; // getUiType().isTab;

export const UnlockScreenContainer: React.FC<Props> = (
  {
    children,
    className,
    style,
  }) => {
  // const {isDarkTheme} = useThemeMode();
  if (isTab) {
    return <CardContainer>{children}</CardContainer>;
  }
  return <CardContainer>{children}</CardContainer>;
};

function Unlock() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Check if locked out
    if (lockoutTime > 0) {
      setError(`Too many attempts. Try again in ${lockoutTime} seconds`)
      return
    }

    setLoading(true)

    try {
      // Attempt to unlock wallet
      await unlockWallet(password)

      // Success - redirect to popup
      window.location.href = "/popup.html"
    } catch (err) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      // Lockout after 5 failed attempts
      if (newAttempts >= 5) {
        setLockoutTime(60) // 60 second lockout
        setError("Too many failed attempts. Locked for 60 seconds")
      } else {
        setError("Incorrect password")
      }

      // Clear password field
      setPassword("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <UnlockScreenContainer>
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Wallet Locked
            </h1>
            <p className="text-gray-600">
              Enter your password to unlock
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
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
                disabled={lockoutTime > 0}
                autoFocus
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Attempts Warning */}
            {attempts > 0 && attempts < 5 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  {5 - attempts} attempt{5 - attempts !== 1 ? "s" : ""} remaining
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || lockoutTime > 0 || !password}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {lockoutTime > 0
                ? `Locked (${lockoutTime}s)`
                : loading
                  ? "Unlocking..."
                  : "Unlock Wallet"}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Forgot your password?{" "}
              <a
                href="/tabs/recover.html"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Recover wallet
              </a>
            </p>
          </div>

          {/* Security Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>🛡️ Security:</strong> Your wallet automatically locks after
              5 minutes of inactivity to protect your funds.
            </p>
          </div>
        </div>
      </div>
    </UnlockScreenContainer>
  )
}

export default Unlock

