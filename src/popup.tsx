import {Flex, Heading, Tabs, Text, Theme} from "@radix-ui/themes"

import { ThemeProvider } from "~components/theme-provider"
import { AccountsTab } from "~components/wallet/accounts-tab"
import { NetworksTab } from "~components/wallet/networks-tab"
import { SettingsTab } from "~components/wallet/settings-tab"
import { TransactionsTab } from "~components/wallet/transactions-tab"
import {Button} from "~components/ui/button";


import "~styles/globals.css"

function IndexPopup() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      <Theme accentColor="gray" className="min-h-[600px] w-[375px]" radius="large">
        <div className="flex flex-col h-full">
          {/* Header */}
          <Flex px={'2'} py={'3'}>
            <Heading color={'grass'}>Smart Wallet Pro</Heading>
            <Text color={'gray'} size={'2'}>Your Web3 companion</Text>
            <Button>New Button</Button>
          </Flex>

          {/* Tab Navigation */}
          <Tabs.Root defaultValue="accounts" className="flex-1 flex flex-col">
            <Tabs.List className="grid w-full grid-cols-4 rounded-none">
              <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
              <Tabs.Trigger value="transactions">Send/Receive</Tabs.Trigger>
              <Tabs.Trigger value="networks">Networks</Tabs.Trigger>
              <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
            </Tabs.List>

            <div className="flex-1 overflow-auto">
              <Tabs.Content value="accounts" className="m-0">
                <AccountsTab />
              </Tabs.Content>

              <Tabs.Content value="transactions" className="m-0">
                <TransactionsTab />
              </Tabs.Content>

              <Tabs.Content value="networks" className="m-0">
                <NetworksTab />
              </Tabs.Content>

              <Tabs.Content value="settings" className="m-0">
                <SettingsTab />
              </Tabs.Content>
            </div>
          </Tabs.Root>
        </div>
      </Theme>
    </ThemeProvider>
  )
}

export default IndexPopup
