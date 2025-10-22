/**
 * Unlock Screen
 * Password entry to unlock wallet
 */

import {useEffect, useRef, useState} from "react"
import {unlockWallet} from "~services/security"
import "~styles/globals.css"
import {CardBody, CardContainer, CardHeader} from "~components/CardContainer";
import {PageBody, PageHeader, PageTabThemesContainer} from "~components/PageContainer";
import {LucideInfo, LucideXCircle} from "lucide-react";
import {Button, Callout, Card, Flex, Heading, Text, TextField} from "@radix-ui/themes";
import {clsx} from "clsx";
import {MINIMUM_PASSWORD_LENGTH} from "~config/constant";
import {getEnhancedUiType, getUiType} from "~utils";


interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// const isTab = getUiType().isTab;
// console.log("isTab", isTab);

const enhancedUiType = getEnhancedUiType();

export const UnlockScreenContainer: React.FC<Props> = (
  {
    children,
    className,
    style,
  }) => {
  // const {isDarkTheme} = useThemeMode();
  if (enhancedUiType.isTab) {
    return <CardContainer>{children}</CardContainer>;
  }
  return <CardContainer variant={'ghost'}>{children}</CardContainer>;
};

function Unlock() {
  const inputEl = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)

  useEffect(() => {
    if (!inputEl.current) return;
    inputEl.current.focus();
  }, []);

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

      // Check if this is an auto-triggered unlock (for approval flows)
      const isAutoUnlock = new URLSearchParams(window.location.search).get('auto') === 'true';

      if (isAutoUnlock) {
        // Close popup for auto-triggered unlocks (let approval flow continue)
        window.close()
      } else {
        // Normal unlock - go to home
        window.location.href = "/popup.html"
      }
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
    <PageTabThemesContainer>
      <UnlockScreenContainer>
        {/*<div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">*/}
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
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Flex direction="column" justify={'center'} gap="6">
              <Flex
                direction={'column'}
                gapY={'3'}
                height={'180px'}
                className={'justify-end py-4'}
              >
                <Heading size={'9'}>
                  <Text as={'div'} size={'3'}>
                    Unlock
                  </Text>
                  {'WalletPro'}
                </Heading>
                <Text
                  as={'div'}
                  className={'plasmo-px-2'}
                  size={'3'}
                  weight={'regular'}
                  color={'gray'}
                >
                  {'The wallet made for humans.'}
                </Text>
              </Flex>

              <label className={'px-1'}>
                <Text as="div" size="2" mb="1" weight="bold">
                  Password
                </Text>
                <TextField.Root
                  autoFocus
                  required
                  className={clsx(enhancedUiType.isTab ? 'h-[56px]' : '')}
                  disabled={lockoutTime > 0}
                  placeholder={'Enter your wallet password'}
                  ref={inputEl}
                  size={'3'}
                  type={'password'}
                  value={password}
                  variant="soft"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <div className={'plasmo-w-full'}>
                <Button
                  highContrast
                  disabled={
                    loading
                      || (!password.trim() && password.trim().length < MINIMUM_PASSWORD_LENGTH / 2)
                      || lockoutTime > 0
                  }
                  size={'3'}
                  type="submit"
                  className={'w-full'}
                  // className="group relative flex plasmo-w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {lockoutTime > 0
                    ? `Locked (${lockoutTime}s)`
                    : loading
                      ? "Unlocking..."
                      : "Unlock Wallet"}
                </Button>
              </div>
            </Flex>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <Text color={'gray'} size={'2'}>
              Forgot your password?{" "}
              <a
                href="/tabs/recover.html"
                className="text-grass10 hover:text-grassA10 font-medium"
              >
                Recover wallet
              </a>
            </Text>
          </div>

          {/* Security Info */}
          <Card className="absolute -bottom-2/4 z-40 mt-6 p-4 rounded-lg">
            <Text color={'gray'} size={'1'}>{/*<Heading size={'2'}>🛡️ Security:</Heading>*/}
              Your wallet automatically locks after 5 minutes of inactivity to protect your funds.
            </Text>
          </Card>

          <div className="hidden rounded-2xl shadow-2xl p-8 w-full max-w-md">
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
        </PageBody>

        {/*</div>*/}
      </UnlockScreenContainer>
    </PageTabThemesContainer>
  )
}

export default Unlock
