import React, {useState, useEffect, type ReactNode} from "react"
import { useNavigate } from "react-router-dom"
import {
  Download,
  Upload,
  Zap,
  ChevronRight,
  ShieldCheck,
} from "lucide-react"
import {Badge, Button, Card, Flex, Heading, Text} from "@radix-ui/themes"
import {lockWallet, isWalletInitialized, getAutoLockTimeout} from "~services/security"
import { hasSeedPhrase, exportAccountData, createBackupFile } from "~services/recovery"
import { getGasSponsorshipStatus } from "~/utils/test-gas-sponsorship"
import { TransactionLogger } from "~services/transactionLogger"
import {cn} from "~lib/utils";
import {useTheme} from "next-themes";
import {formatAutoLockTimeout} from "~utils";

export function SettingsTab() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [hasBackup, setHasBackup] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gasSponsorshipStatus, setGasSponsorshipStatus] = useState<{
    enabled: boolean
    status: "active" | "inactive" | "not-configured"
    message: string
    icon: string
  } | null>(null)
  const [themeIcon, setThemeIcon] = useState<ReactNode | null>();
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(5 * 60 * 1000) // default fallback

  useEffect(() => {
    checkSecurityStatus()
  }, [])

  useEffect(() => {
    if (theme === 'light') {
      setThemeIcon(<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"></path><path d="M120,40V32a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-8-8A8,8,0,0,0,50.34,61.66Zm0,116.68-8,8a8,8,0,0,0,11.32,11.32l8-8a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l8-8a8,8,0,0,0-11.32-11.32l-8,8A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l8,8a8,8,0,0,0,11.32-11.32ZM40,120H32a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16Zm88,88a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-8A8,8,0,0,0,128,208Zm96-88h-8a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16Z"></path></svg>)
    } else if (theme === 'dark') {
      setThemeIcon(<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M210.69,158.18A88,88,0,1,1,97.82,45.31,96.08,96.08,0,0,0,192,160,96.78,96.78,0,0,0,210.69,158.18Z" opacity="0.2"></path><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"></path></svg>)
    } else {
      setThemeIcon(<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,64V176a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V64A16,16,0,0,1,48,48H208A16,16,0,0,1,224,64Z" opacity="0.2"></path><path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Zm-48,48a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,224Z"></path></svg>)
    }
  }, [theme]);

  useEffect(() => {
    const loadAutoLockTimeout = async () => {
      try {
        const timeout = await getAutoLockTimeout()
        setAutoLockTimeout(timeout)
      } catch (error) {
        console.error('Failed to load auto-lock timeout:', error)
      }
    }

    loadAutoLockTimeout()
  }, [])


  const checkSecurityStatus = async () => {
    const backup = await hasSeedPhrase()
    const init = await isWalletInitialized()
    const gasStatus = await getGasSponsorshipStatus()
    setHasBackup(backup)
    setIsInitialized(init)
    setGasSponsorshipStatus(gasStatus)
  }

  const handleLockWallet = async () => {
    try {
      await lockWallet()
      // Redirect to unlock page
      window.location.href = '/tabs/unlock.html'
    } catch (error) {
      console.error('Failed to lock wallet:', error)
    }
  }

  const handleBackupSeed = () => {
    window.open('/tabs/backup-seed.html', '_blank', 'width=600,height=800')
  }

  const handleExportBackup = async () => {
    setLoading(true)
    try {
      const password = prompt('Enter your password to export backup:')
      if (!password) return

      const encrypted = await exportAccountData(password)
      const blob = createBackupFile(encrypted)

      // Download file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `smart-wallet-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      alert('Backup exported successfully!')
    } catch (error) {
      alert('Failed to export backup: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImportBackup = () => {
    window.open('/tabs/recover.html', '_blank', 'width=600,height=800')
  }

  const handleClearDatabase = async () => {
    const confirm = window.confirm(
      "⚠️ WARNING: This will permanently delete all transaction history!\n\n" +
      "This action cannot be undone. Make sure to backup any important data.\n\n" +
      "Continue?"
    )

    if (!confirm) return

    setLoading(true)
    try {
      // Clear transaction database
      await TransactionLogger.clearAll()

      // Clear other storage too
      // localStorage.clear()
      // sessionStorage.clear()

      alert("✅ Transaction data cleared successfully!")

      // Reload the page to reset the app state
      window.location.reload()
    } catch (error) {
      console.error("Failed to clear database:", error)
      alert("❌ Failed to clear database: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/*<h2 className="text-xl font-bold mb-4">Settings</h2>*/}

      {/* Security Status */}
      <Card className="rounded-lg p-4 space-y-3">
        <Flex align={'center'} gap={'1'} mb={'3'}>
          <ShieldCheck className={cn("w-5 h-5 text-green-600", isInitialized ? "fill-green-500/20" : "fill-red-500")} />
          <Heading size={'3'}>Security Status</Heading>
        </Flex>

        <div className="space-y-2 text-sm">
          <Flex align={'center'} justify={'between'}>
            <Text color={'gray'} size={'2'}>Password Protection</Text>
            <Text color={isInitialized ? "grass" : "red"}>
              {
                isInitialized
                  ? (
                    <Flex align={'center'} gap={'1'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M256,72V184a16,16,0,0,1-16,16H16A16,16,0,0,1,0,184V72A16,16,0,0,1,16,56H240A16,16,0,0,1,256,72Z" opacity="0.2"></path><path d="M48,56V200a8,8,0,0,1-16,0V56a8,8,0,0,1,16,0Zm92,54.5L120,117V96a8,8,0,0,0-16,0v21L84,110.5a8,8,0,0,0-5,15.22l20,6.49-12.34,17a8,8,0,1,0,12.94,9.4l12.34-17,12.34,17a8,8,0,1,0,12.94-9.4l-12.34-17,20-6.49A8,8,0,0,0,140,110.5ZM246,115.64A8,8,0,0,0,236,110.5L216,117V96a8,8,0,0,0-16,0v21l-20-6.49a8,8,0,0,0-4.95,15.22l20,6.49-12.34,17a8,8,0,1,0,12.94,9.4l12.34-17,12.34,17a8,8,0,1,0,12.94-9.4l-12.34-17,20-6.49A8,8,0,0,0,246,115.64Z"></path></svg>
                      Enabled
                    </Flex>
                  )
                  : (
                    <Flex align={'center'} gap={'1'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                    </Flex>
                  )
              }
            </Text>
          </Flex>
          <Flex align={'center'} justify={'between'}>
            <Text color={'gray'}>Seed Phrase Backup</Text>
            <Text color={hasBackup ? "grass" : "amber"}>
              {
                hasBackup
                  ? (
                    <Flex align={'center'} gap={'1'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M240,128a80,80,0,0,1-80,80H72A56,56,0,1,1,85.92,97.74l0,.1A80,80,0,0,1,240,128Z" opacity="0.2"></path><path d="M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Zm37.66-93.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L144,148.69l42.34-42.35A8,8,0,0,1,197.66,106.34Z"></path></svg>
                      Backed Up
                    </Flex>
                  )
                  : (
                    <Flex align={'center'} gap={'1'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M240,127.62a80,80,0,0,1-80,80H72A56,56,0,1,1,85.92,97.36l0,.1A80,80,0,0,1,240,127.62Z" opacity="0.2"></path><path d="M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Zm-8-72V88a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,172,164Z"></path></svg>
                      Not Backed Up
                    </Flex>
                  )
              }
            </Text>
          </Flex>
          <Flex align={'center'} justify={'between'}>
            <Text color={'gray'}>Auto-Lock</Text>
            <Text color={'grass'}>
              <Flex align={'center'} gap={'1'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M232,136.66A104.12,104.12,0,1,1,119.34,24,8,8,0,0,1,120.66,40,88.12,88.12,0,1,0,216,135.34,8,8,0,0,1,232,136.66ZM120,72v56a8,8,0,0,0,8,8h56a8,8,0,0,0,0-16H136V72a8,8,0,0,0-16,0Zm40-24a12,12,0,1,0-12-12A12,12,0,0,0,160,48Zm36,24a12,12,0,1,0-12-12A12,12,0,0,0,196,72Zm24,36a12,12,0,1,0-12-12A12,12,0,0,0,220,108Z"></path></svg>
                {formatAutoLockTimeout(autoLockTimeout)}
              </Flex>
            </Text>
          </Flex>
          <Flex align={'center'} justify={'between'}>
            <Text color={'gray'}>Gas Sponsorship</Text>
            <Badge
              color={gasSponsorshipStatus?.enabled ? "green" : "gray"}
              variant="soft"
              size="1"
            >
              {gasSponsorshipStatus?.enabled ? (
                <>
                  <Zap size={10} />
                  Active
                </>
              ) : (
                "Inactive"
              )}
            </Badge>
          </Flex>
        </div>
      </Card>

      {/* Gas Sponsorship Info */}
      {/*{gasSponsorshipStatus?.enabled && (
        <Callout.Root color="grass" size="1">
          <Callout.Icon>
            <Zap size={16} />
            <Text color={'grass'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2"></path><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path></svg>
            </Text>
          </Callout.Icon>
          <Callout.Text>
            <strong>Gasless Transactions Enabled!</strong><br/> Your transactions don't require ETH for gas fees. Powered by Alchemy Gas Manager.
          </Callout.Text>
        </Callout.Root>
      )}*/}

      {/* Backup Warning */}
      {!hasBackup && (
        <Card className="bg-amber10/30 p-4">
          <Flex align={'center'} gap={'1'} mb={'1'}>
            {/*<AlertTriangle className="text-yellow-600" size={16} />*/}
            <Text color={'amber'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z" opacity="0.2"></path><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path></svg>
            </Text>
            <Heading color={'amber'} size={'3'}>Backup Recommended</Heading>
          </Flex>
          <div className="flex items-start gap-2">
            <div>
              <Text color={'amber'} size={'2'} className="mb-3">
                You haven't backed up your seed phrase. Without it, you cannot recover your wallet if you lose access.
              </Text>
              <Flex align={'center'} justify={'end'} gap={'2'}>
                <Button color={'amber'} onClick={handleBackupSeed}>Backup</Button>
              </Flex>
            </div>
          </div>
        </Card>
      )}

      {/*<Button
        variant="soft"
        color="gray"
        size="1"
        onClick={() => navigate('/settings/test-transactions')}
      >
        <Zap className="w-3 h-3 mr-2" />
        Test Transactions
      </Button>*/}


      {/* Actions */}
      <Flex direction={'column'} gap={'2'} py={'2'}>
        <Heading size={'3'} mb={'2'}>Actions</Heading>

        <Card
          onClick={() => navigate('/settings/privacy')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'center'} gap={'2'}>
              {/*<Shield className="w-4 h-4 mr-2" />*/}
              <Text>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,96V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H208A8,8,0,0,1,216,96Z" opacity="0.2"></path><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80Zm-48,88a12,12,0,1,1-12-12A12,12,0,0,1,160,168Zm32-88H64V56a32,32,0,0,1,64,0V80h32V96H192A8,8,0,0,0,192,80Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>Privacy Policy</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>

        <Card
          onClick={() => navigate('/settings/about')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'center'} gap={'2'}>
              {/*<Shield className="w-4 h-4 mr-2" />*/}
              <Text>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M144,176a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128ZM124,96a12,12,0,1,0-12-12A12,12,0,0,0,124,96Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>About</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>

        <Card
          onClick={() => navigate('/settings/connected-apps')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'center'} gap={'2'}>
              {/*<Link className="w-4 h-4 mr-2" />*/}
              <Text>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M160,40a88.11,88.11,0,0,0-16,1.09V24a8,8,0,0,0-16,0V41.09A88,88,0,1,0,160,214.91V232a8,8,0,0,0,16,0V214.91A88.11,88.11,0,0,0,176,216a8,8,0,0,0,0-16,72,72,0,1,1-40-130.67V96a8,8,0,0,0,16,0V75.78A88.56,88.56,0,0,0,160,40Zm-8,127.4a8,8,0,0,0-7.89,6.68h0a7.92,7.92,0,0,0,1.51,5.34A47.94,47.94,0,0,1,168,176a48,48,0,0,1,0-95.4,8,8,0,0,0-16,0,32,32,0,0,0,0,64,33,33,0,0,0,14.91-3.49A8,8,0,0,0,152,167.4Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>Connected Apps</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>

        <Card
          onClick={() => navigate('/settings/about')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'center'} gap={'2'}>
              {/*<Shield className="w-4 h-4 mr-2" />*/}
              <Text>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M144,176a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128ZM124,96a12,12,0,1,0-12-12A12,12,0,0,0,124,96Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>About</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>
      </Flex>

      {/* Preferences */}
      <Flex direction={'column'} gap={'2'} py={'2'}>
        <Heading size={'3'} mb={'2'}>Preferences</Heading>
        <Card
          onClick={() => navigate('/settings/preferences')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'start'} gap={'2'}>
              {/*<Settings className="w-4 h-4" />*/}
              <Text color={'gray'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,0,1,184.92,50.69a16,16,0,0,0,20.39,20.39A95.61,95.61,0,0,1,216,128Z" opacity="0.2"></path><path d="M228.25,63.07l-4.66-2.69a23.6,23.6,0,0,0,0-8.76l4.66-2.69a8,8,0,0,0-8-13.86l-4.67,2.7A23.92,23.92,0,0,0,208,33.38V28a8,8,0,0,0-16,0v5.38a23.92,23.92,0,0,0-7.58,4.39l-4.67-2.7a8,8,0,1,0-8,13.86l4.66,2.69a23.6,23.6,0,0,0,0,8.76l-4.66,2.69a8,8,0,0,0,4,14.93,7.92,7.92,0,0,0,4-1.07l4.67-2.7A23.92,23.92,0,0,0,192,78.62V84a8,8,0,0,0,16,0V78.62a23.92,23.92,0,0,0,7.58-4.39l4.67,2.7a7.92,7.92,0,0,0,4,1.07,8,8,0,0,0,4-14.93ZM192,56a8,8,0,1,1,8,8A8,8,0,0,1,192,56Zm29.35,48.11a8,8,0,0,0-6.57,9.21A88.85,88.85,0,0,1,216,128a87.62,87.62,0,0,1-22.24,58.41,79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75A88,88,0,0,1,128,40a88.76,88.76,0,0,1,14.68,1.22,8,8,0,0,0,2.64-15.78,103.92,103.92,0,1,0,85.24,85.24A8,8,0,0,0,221.35,104.11ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>Auto-Lock Duration</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>

        <Card
          onClick={() => navigate('/settings/themes')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'start'} gap={'2'}>
              <Text color={'gray'}>{themeIcon}</Text>
              <Text color={'gray'} size={'2'}>Change Theme</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>
      </Flex>

      {/* Security Actions */}
      <div className="rounded-lg py-2 space-y-2">
        <Heading size={'3'} mb={'2'}>Security</Heading>

        <Card
          onClick={handleLockWallet}
          variant="surface"
          className="w-full justify-start"
        >
          <Flex align={'center'} justify={'start'} gap={'4'}>
            {/*<Lock className="w-4 h-4" />*/}
            <Text color={'gray'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,96V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H208A8,8,0,0,1,216,96Z" opacity="0.2"></path><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z"></path></svg>
            </Text>
            <Text size={'2'}>Lock Wallet</Text>
          </Flex>
        </Card>

        <Card
          onClick={handleBackupSeed}
          variant="surface"
          className="w-full justify-start"
        >
          <Flex align={'center'} justify={'start'} gap={'4'}>
            {/*<Key color={'gray'} className="w-4 h-4" />*/}
            <Text color={'gray'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M232,98.36C230.73,136.92,198.67,168,160.09,168a71.68,71.68,0,0,1-26.92-5.17h0L120,176H96v24H72v24H40a8,8,0,0,1-8-8V187.31a8,8,0,0,1,2.34-5.65l58.83-58.83h0A71.68,71.68,0,0,1,88,95.91c0-38.58,31.08-70.64,69.64-71.87A72,72,0,0,1,232,98.36Z" opacity="0.2"></path><path d="M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z"></path></svg>
            </Text>
            <Text size={'2'}>{hasBackup ? 'View Seed Phrase' : 'Backup Seed Phrase'}</Text>
          </Flex>
        </Card>

        <Card
          onClick={handleExportBackup}
          variant="surface"
          className="w-full justify-start"
        >
          <Flex align={'center'} justify={'start'} gap={'4'}>
            <Text color={'gray'}><Download className="w-4 h-4" /></Text>
            <Text size={'2'}>Export Backup File</Text>
          </Flex>
        </Card>

        <Card
          onClick={handleImportBackup}
          variant="surface"
          className="w-full justify-start"
        >
          <Flex align={'center'} gap={'4'} justify={'start'}>
            <Text color={'gray'}>
              <Upload className="w-4 h-4" />
            </Text>
            <Text size={'2'}>Import Backup File</Text>
          </Flex>
        </Card>
      </div>

      {/* Advanced Settings */}
      <div className="rounded-lg py-2 space-y-2">
        <h3 className="font-semibold mb-3">Advanced</h3>

        <Card
          hidden
          onClick={() => navigate('/settings/gas')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'center'} gap={'2'}>
              {/*<Zap className="w-4 h-4 mr-2" />*/}
              <Text color={'gray'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2"></path><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>Gas Sponsorship</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>

        <Card
          onClick={() => navigate('/settings/logs')}
          variant="surface"
          className="w-full justify-between"
        >
          <Flex align={'center'} justify={'between'}>
            <Flex align={'center'} gap={'2'}>
              {/*<FileText className="w-4 h-4 mr-2" />*/}
              <Text color={'gray'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M208,40V200a24,24,0,0,1-24,24H72a24,24,0,0,1-24-24V40Z" opacity="0.2"></path><path d="M168,128a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,128Zm-8,24H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16ZM216,40V200a32,32,0,0,1-32,32H72a32,32,0,0,1-32-32V40a8,8,0,0,1,8-8H72V24a8,8,0,0,1,16,0v8h32V24a8,8,0,0,1,16,0v8h32V24a8,8,0,0,1,16,0v8h24A8,8,0,0,1,216,40Zm-16,8H184v8a8,8,0,0,1-16,0V48H136v8a8,8,0,0,1-16,0V48H88v8a8,8,0,0,1-16,0V48H56V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16Z"></path></svg>
              </Text>
              <Text color={'gray'} size={'2'}>Transaction Logs</Text>
            </Flex>
            <ChevronRight className="w-4 h-4" />
          </Flex>
        </Card>
      </div>


      {/* Danger */}
      <Flex hidden direction={'column'} gap={'2'} py={'2'}>
        <Heading size={'3'} mb={'2'}>Danger</Heading>

        <Card
          onClick={handleClearDatabase}
          variant="surface"
          className="w-full"
        >
          <Flex align={'center'} justify={'start'} gap={'4'}>
            <Text color={'red'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z" opacity="0.2"></path><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path></svg>
            </Text>
            <Flex direction={'column'} align={'start'} justify={'center'}>
              <Text size={'2'}>Clear Transaction Data</Text>
              <Text size={'1'} color={'gray'}>
                Removes all transaction history and resets local database
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </div>
  )
}
