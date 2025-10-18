import { SettingsTab } from "~components/wallet/settings-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import React, {useEffect, useState} from "react";
import {Badge, Callout, Flex, HoverCard, Text} from "@radix-ui/themes";
import {NavLink} from "react-router-dom";
import {hasSeedPhrase} from "~services/recovery";
import {isWalletInitialized} from "~services/security";
import {getGasSponsorshipStatus} from "~utils/test-gas-sponsorship";

export function SettingsPage() {
  const [hasBackup, setHasBackup] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [gasSponsorshipStatus, setGasSponsorshipStatus] = useState<{
    enabled: boolean
    status: "active" | "inactive" | "not-configured"
    message: string
    icon: string
  } | null>(null);

  useEffect(() => {
    checkSecurityStatus()
  }, [])

  const checkSecurityStatus = async () => {
    const backup = await hasSeedPhrase()
    const init = await isWalletInitialized()
    const gasStatus = await getGasSponsorshipStatus()
    setHasBackup(backup)
    setIsInitialized(init)
    setGasSponsorshipStatus(gasStatus)
  }

  return (
    <PageContainer>
      <PageHeader showBackButton={false}>
        <Flex align={'center'} justify={'between'}>
          <PageHeading>Settings</PageHeading>
          {gasSponsorshipStatus?.enabled && <HoverCard.Root>
            <HoverCard.Trigger hidden>
              <Badge
                color={gasSponsorshipStatus?.enabled ? "green" : "gray"}
                variant="soft"
                size="1"
              >
                <Text color={'grass'}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" strokeWidth={3}
                       viewBox="0 0 256 256">
                    <path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2"></path>
                    <path
                      d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path>
                  </svg>
                </Text>
                  <Text color={'grass'} size={'2'} weight={'medium'}>Sponsored</Text>
              </Badge>
            </HoverCard.Trigger>
            <HoverCard.Content size={'1'} maxWidth="300px">
              <Flex gap="4">
                {/* Gas Sponsorship Info */}
                <Callout.Root color="grass" size="1">
                  <Callout.Icon>
                    {/*<Zap size={16} />*/}
                    <Text color={'grass'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor"
                           viewBox="0 0 256 256">
                        <path d="M96,240l16-80L48,136,160,16,144,96l64,24Z" opacity="0.2"></path>
                        <path
                          d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"></path>
                      </svg>
                    </Text>
                  </Callout.Icon>
                  <Callout.Text>
                    <strong>Gasless Transactions Enabled!</strong><br/> Your transactions don't require ETH for gas
                    fees. Powered by Alchemy Gas Manager.
                  </Callout.Text>
                </Callout.Root>
              </Flex>
            </HoverCard.Content>
          </HoverCard.Root>}
        </Flex>
      </PageHeader>
      {/*<div className="min-h-[600px] w-[375px] flex flex-col">*/}
        {/*<WalletHeader title="Settings" />*/}
      <PageBody>
        <SettingsTab />
        {/*<div className="flex-1 overflow-auto pb-16">*/}
        {/*</div>*/}
      </PageBody>
      <BottomNavigation />
      {/*</div>*/}
    </PageContainer>
  )
}
