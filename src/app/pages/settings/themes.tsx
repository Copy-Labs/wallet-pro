import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import {ArrowLeft, Sun, Moon, Monitor, Check, CheckCircle2} from "lucide-react"
import {Button, Text, RadioGroup, Flex, Card, Heading, RadioCards} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"

import { getAutoLockTimeout, setAutoLockTimeout } from "~services/security"
import { toast } from "sonner"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";

export function SettingsThemesPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(5 * 60 * 1000)

  useEffect(() => {
    loadAutoLockTimeout()
  }, [])

  const loadAutoLockTimeout = async () => {
    try {
      const timeout = await getAutoLockTimeout()
      setAutoLockTimeoutState(timeout)
    } catch (error) {
      console.error('Failed to load auto-lock timeout:', error)
    }
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    toast.success(`Theme changed to ${newTheme}`)
  }

  const handleAutoLockChange = async (newTimeout: number) => {
    try {
      await setAutoLockTimeout(newTimeout)
      setAutoLockTimeoutState(newTimeout)
      toast.success(`Auto-lock set to ${newTimeout / (60 * 1000)} minutes`)
    } catch (error) {
      console.error('Failed to update auto-lock timeout:', error)
      toast.error('Failed to update auto-lock timeout')
    }
  }

  return (
    <PageContainer>
      <PageHeader>
        {/* Header */}
        <PageHeading>Change Wallet Theme</PageHeading>
      </PageHeader>

      <PageBody>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <RadioCards.Root color={'grass'} defaultValue="1" columns={{ initial: "1", sm: "3" }} value={theme} onValueChange={handleThemeChange}>
              <RadioCards.Item value="light">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text weight="bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z" opacity="0.2"></path><path d="M120,40V32a8,8,0,0,1,16,0v8a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-8-8A8,8,0,0,0,50.34,61.66Zm0,116.68-8,8a8,8,0,0,0,11.32,11.32l8-8a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l8-8a8,8,0,0,0-11.32-11.32l-8,8A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l8,8a8,8,0,0,0,11.32-11.32ZM40,120H32a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16Zm88,88a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-8A8,8,0,0,0,128,208Zm96-88h-8a8,8,0,0,0,0,16h8a8,8,0,0,0,0-16Z"></path></svg>
                  </Text>
                  <Text>Light</Text>
                </Flex>
                {theme === 'light' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
              <RadioCards.Item value="dark">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text weight="bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M210.69,158.18A88,88,0,1,1,97.82,45.31,96.08,96.08,0,0,0,192,160,96.78,96.78,0,0,0,210.69,158.18Z" opacity="0.2"></path><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"></path></svg>
                  </Text>
                  <Text>Dark</Text>
                </Flex>
                {theme === 'dark' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
              <RadioCards.Item value="system">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text weight="bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,64V176a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V64A16,16,0,0,1,48,48H208A16,16,0,0,1,224,64Z" opacity="0.2"></path><path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Zm-48,48a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,224Z"></path></svg>
                  </Text>
                  <Text>System</Text>
                </Flex>
                {theme === 'system' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
            </RadioCards.Root>

            <RadioGroup.Root hidden color={'grass'} value={theme} onValueChange={handleThemeChange}>
              <Flex direction={"column"} gap={"3"}>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="light" />
                    <Flex align={'center'} gap={'2'}>
                      <Sun className="w-4 h-4 text-yellow-600" />
                      Light
                    </Flex>
                  </Flex>
                </Text>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="dark" />
                    <Flex align={'center'} gap={'2'}>
                      <Moon className="w-4 h-4 text-blue-600" />
                      Dark
                    </Flex>
                  </Flex>
                </Text>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="system" />
                    <Flex align={'center'} gap={'2'}>
                      <Monitor className="w-4 h-4 text-gray-600" />
                      System
                    </Flex>
                  </Flex>
                </Text>
              </Flex>
            </RadioGroup.Root>
          </div>
        </div>
      </PageBody>
    </PageContainer>
  )
}
