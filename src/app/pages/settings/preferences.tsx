import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { ArrowLeft, Sun, Moon, Monitor } from "lucide-react"
import {Button, Text, RadioGroup, Flex, Card, Heading, RadioCards} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"

import { getAutoLockTimeout, setAutoLockTimeout } from "~services/security"
import { toast } from "sonner"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";

export function SettingsPreferencesPage() {
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
        <PageHeading>Change Auto-Lock Time</PageHeading>
      </PageHeader>

      <PageBody>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Auto-Lock Info */}
          <Card>
            <Flex direction={'column'} gap={'2'}>
              <Text size={'1'} className={'space-y-2'}>
                1. Auto-lock protect your wallet by automatically locking it after a period of inactivity.
                <br/><br/>
                2. This ensures your funds remain secure even if you walk away from your device.
              </Text>
            </Flex>
          </Card>

          {/* Auto-Lock Time */}
          <div className="space-y-3">
            <RadioCards.Root
              color={'grass'}
              columns={{ initial: "2", sm: "2" }}
              defaultValue="1"
              value={Math.round(autoLockTimeout / (60 * 1000)).toString()}
              onValueChange={(value) => handleAutoLockChange(parseInt(value) * 60 * 1000)}
            >
              <RadioCards.Item value="1">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text>1 minute</Text>
                </Flex>
                {Math.round(autoLockTimeout / (60 * 1000)).toString() === '1' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
              <RadioCards.Item value="5">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text>5 minutes</Text>
                </Flex>
                {Math.round(autoLockTimeout / (60 * 1000)).toString() === '5' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
              <RadioCards.Item value="15">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text>15 minutes</Text>
                </Flex>
                {Math.round(autoLockTimeout / (60 * 1000)).toString() === '15' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
              <RadioCards.Item value="30">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text>30 minutes</Text>
                </Flex>
                {Math.round(autoLockTimeout / (60 * 1000)).toString() === '30' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
              <RadioCards.Item value="60">
                <Flex align={'center'} gap={'2'} width="100%">
                  <Text>1 hour</Text>
                </Flex>
                {Math.round(autoLockTimeout / (60 * 1000)).toString() === '60' && <Text color={'grass'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
                </Text>}
              </RadioCards.Item>
            </RadioCards.Root>

            <RadioGroup.Root
              hidden
              value={Math.round(autoLockTimeout / (60 * 1000)).toString()}
              onValueChange={(value) => handleAutoLockChange(parseInt(value) * 60 * 1000)}
            >
              <Flex direction={"column"} gap={"3"}>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="1" />
                    1 minute
                  </Flex>
                </Text>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="5" />
                    5 minutes
                  </Flex>
                </Text>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="15" />
                    15 minutes
                  </Flex>
                </Text>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="30" />
                    30 minutes
                  </Flex>
                </Text>
                <Text as="label" size={"2"}>
                  <Flex gap={"2"}>
                    <RadioGroup.Item value="60" />
                    1 hour
                  </Flex>
                </Text>
              </Flex>
            </RadioGroup.Root>
          </div>
        </div>
      </PageBody>

      {/* Bottom Navigation */}
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
