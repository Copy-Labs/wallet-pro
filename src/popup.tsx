import { useEffect, useState } from "react"
import { HashRouter } from "react-router-dom"
import {Flex, Heading, Spinner, Theme} from "@radix-ui/themes"

import { ThemeProvider } from "~components/theme-provider"
import { WalletRouter } from "~app/router"
import { lockWallet, isWalletLocked, isWalletInitialized } from "~services/security"
import { hasSeedPhrase } from "~services/recovery"
import { getAllAccounts } from "~services/wallet"
import { initializeStorageSync } from "~store/storage-sync"
import { setupBackgroundBridge } from "~store/background-bridge"
import { useUIStore } from "~store/ui-store"

import "~styles/globals.css"
import {Toaster} from "sonner";

function IndexPopup() {
  const [hasBackup, setHasBackup] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null)
  const { setWalletLocked } = useUIStore()

  useEffect(() => {
    checkSecurity()
    // Initialize storage sync for UI state management
    initializeStorageSync()
    // Setup background script bridge
    setupBackgroundBridge()
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

      // Update store with lock status (will be false if we get here)
      setWalletLocked(locked)

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
          <Flex direction={'column'} align={'center'} justify={'center'} p={'4'}>
            <Spinner size={'3'} />
            <Heading>Loading...</Heading>
          </Flex>
        </Theme>
      </ThemeProvider>
    )
  }

  const handleLock = async () => {
    try {
      await lockWallet()
      // Update store that wallet is now locked
      setWalletLocked(true)
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
      <Theme
        accentColor="gray"
        appearance={'inherit'}
        grayColor="sand"
        className="min-h-[600px] w-[375px]"
        radius="large"
      >
        <Toaster
          visibleToasts={2}
          richColors={true}
          duration={4000}
          closeButton={true}
        />
        <HashRouter>
          <WalletRouter />
        </HashRouter>
      </Theme>
    </ThemeProvider>
  )
}

export default IndexPopup
