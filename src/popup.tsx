import { useEffect, useState } from "react"
import { HashRouter } from "react-router-dom"
import { Theme } from "@radix-ui/themes"

import { ThemeProvider } from "~components/theme-provider"
import { WalletRouter } from "~app/router"
import { lockWallet, isWalletLocked, isWalletInitialized } from "~services/security"
import { hasSeedPhrase } from "~services/recovery"
import { getAllAccounts } from "~services/wallet"

import "~styles/globals.css"

function IndexPopup() {
  const [hasBackup, setHasBackup] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null)

  useEffect(() => {
    checkSecurity()
  }, [])

  const checkSecurity = async () => {
    try {
      console.log('[Popup] Checking security status...')

      // Check if wallet is initialized with password
      const initialized = await isWalletInitialized()
      console.log('[Popup] Initialized:', initialized)

      if (!initialized) {
        // First time user - needs to set up password
        console.log('[Popup] Redirecting to setup-password')
        setShouldRedirect('tabs/setup-password.html')
        return
      }

      // Check if locked (should redirect if locked)
      const locked = await isWalletLocked()
      console.log('[Popup] Locked:', locked)

      if (locked) {
        console.log('[Popup] Redirecting to unlock')
        setShouldRedirect('tabs/unlock.html')
        return
      }

      // Check if user has any accounts
      const accounts = await getAllAccounts()
      console.log('[Popup] Accounts:', accounts.length)

      if (accounts.length === 0) {
        // No accounts - needs onboarding
        console.log('[Popup] Redirecting to onboarding')
        setShouldRedirect('tabs/onboarding.html')
        return
      }

      // Check security status
      const backup = await hasSeedPhrase()
      console.log('[Popup] Has backup:', backup)

      setIsSecure(initialized)
      setHasBackup(backup)
      setLoading(false)
      console.log('[Popup] Ready to show wallet')
    } catch (error) {
      console.error('[Popup] Failed to check security:', error)
      // On error, assume first time setup
      setShouldRedirect('tabs/setup-password.html')
    }
  }

  // Handle redirects
  useEffect(() => {
    if (shouldRedirect) {
      console.log('[Popup] Redirecting to:', shouldRedirect)
      const fullUrl = chrome.runtime.getURL(shouldRedirect)
      console.log('[Popup] Full URL:', fullUrl)

      // Open in new tab and close popup
      chrome.tabs.create({ url: fullUrl }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Failed to create tab:', chrome.runtime.lastError)
        } else {
          console.log('[Popup] Tab created successfully')
          window.close()
        }
      })
    }
  }, [shouldRedirect])

  // Show loading screen while checking
  if (loading || shouldRedirect) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange>
        <Theme accentColor="gray" className="min-h-[600px] w-[375px]" radius="large">
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-6xl mb-4">🔄</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Loading...
            </h1>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </Theme>
      </ThemeProvider>
    )
  }

  const handleLock = async () => {
    try {
      await lockWallet()
      window.location.href = '/tabs/unlock.html'
    } catch (error) {
      console.error('Failed to lock wallet:', error)
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      <Theme accentColor="gray" className="min-h-[600px] w-[375px]" radius="large">
        <HashRouter>
          <WalletRouter />
        </HashRouter>
      </Theme>
    </ThemeProvider>
  )
}

export default IndexPopup
