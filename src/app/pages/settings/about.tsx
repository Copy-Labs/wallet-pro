import { ExternalLink, Github, Mail } from "lucide-react"
import { Button } from "~components/ui/button"
import {Card, Flex, Heading, Separator, Text} from "@radix-ui/themes"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";

export function SettingsAboutPage() {

  // Get app version from package.json
  const appVersion = "0.0.1"
  const buildDate = new Date().toLocaleDateString()

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader>
        <PageHeading>About</PageHeading>
      </PageHeader>

      <PageBody>
        <div className="flex-1 overflow-auto p-4 space-y-8">
          {/* App Info */}
          <Flex direction="column" align="center" gap="1">
            <Heading size="6">Wallet Pro</Heading>
            <Text color="gray">Version {appVersion}</Text>
            {/*<Text color="gray" size="1">Built on {buildDate}</Text>*/}
          </Flex>

          {/* Description */}
          <Flex direction="column" gap="2">
            {/*<Heading size="4">About</Heading>*/}
            <Text color="gray" size={'2'} wrap={'pretty'}>
              WalletPro is a <Text className="underline underline-offset-2 decoration-grass10 decoration-wavy" weight='bold'>developer-first</Text> wallet built exclusively for testnets,
              so you can explore, build, and break things without ever putting your valuable (mainnet) assets at risk.
              <br/>
              Experience beautiful UX, gas sponsorship, secure, encrypted seed phrase backup and
              smart account features powered by Alchemy AA.
              {/*Wallet Pro simplifies blockchain interactions by abstracting gas fees through
              Account Abstraction. Experience secure, user-friendly Web3 with encrypted seed phrase
              backup and smart account features powered by Alchemy AA.*/}
            </Text>
          </Flex>

          {/* Vision */}
          <Flex direction="column" gap="2">
            <Heading size="4">Our Vision</Heading>
            <Text color="gray" size={'2'}>
              To create a safer web3 development ecosystem where developers can innovate confidently without risking their real assets. This empowers every builder with a dedicated, secure, and seamless testnet-only wallet.
            </Text>
          </Flex>

          {/* Mission */}
          <Flex direction="column" gap="2">
            <Heading size="4">Our Mission</Heading>
            {/*<Text color="gray" size={'2'}>
              Democratize access to Web3 by abstracting every complexity,
              making blockchain technology accessible to non-technical users worldwide.
            </Text>*/}
            <Text color="gray" size="2">
              Our mission is to eliminate the risk of accidental mainnet exposure during development by
              providing a secure, intuitive, and developer-first wallet that connects exclusively to testnets.
            </Text>
            <Flex direction={'column'}>
              <Text color='gray' size='2'>We strive to:</Text>
              <ul className={'list-disc px-4'}>
                <li><Text color={'gray'} size='2'>Protect developers from scams, malicious DApps, and accidental mainnet interactions.</Text></li>
                <li><Text color={'gray'} size='2'>Simplify testing workflows with a clean, fast, and developer-oriented experience.</Text></li>
                <li><Text color={'gray'} size='2'>Promote safer web3 practices, ensuring that experimentation never threatens real funds.</Text></li>
                <li><Text color={'gray'} size='2'>Support the ecosystem by making testnet usage reliable, convenient, and foolproof.</Text></li>
              </ul>
            </Flex>
          </Flex>

          {/* Features */}
          <Flex direction="column" gap="4">
            <Heading size="4">Features</Heading>

            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Heading size="3" weight="medium">Secure Backup</Heading>
                <Text size="2" color="gray">Encrypted seed phrases for account recovery</Text>
              </Flex>

              <Flex direction="column" gap="1">
                <Heading size="3" weight="medium">Gasless Transactions</Heading>
                <Text size="2" color="gray">Sponsored transactions up to $1</Text>
              </Flex>

              <Flex direction="column" gap="1">
                <Heading size="3" weight="medium">Multi-Chain Support</Heading>
                <Text size="2" color="gray">Works on 690+ testnets</Text>
              </Flex>

              <Flex direction="column" gap="1">
                <Heading size="3" weight="medium">Account Abstraction</Heading>
                <Text size="2" color="gray">EIP-7702 smart accounts with delegation</Text>
              </Flex>
            </Flex>
          </Flex>

          {/* Tech Stack */}
          <Flex hidden direction="column" gap="4">
            <Heading size="4">Technology</Heading>

            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Text size="4">🧪</Text>
                <Flex direction="column">
                  <Text weight="medium">Alchemy AA</Text>
                  <Text size="2" color="gray">Smart Accounts</Text>
                </Flex>
              </Flex>

              <Flex align="center" gap="2">
                <Text size="4">🔷</Text>
                <Flex direction="column">
                  <Text weight="medium">Viem</Text>
                  <Text size="2" color="gray">Ethereum Library</Text>
                </Flex>
              </Flex>

              <Flex align="center" gap="2">
                <Text size="4">⚛️</Text>
                <Flex direction="column">
                  <Text weight="medium">React</Text>
                  <Text size="2" color="gray">UI Framework</Text>
                </Flex>
              </Flex>

              <Flex align="center" gap="2">
                <Text size="4">💎</Text>
                <Flex direction="column">
                  <Text weight="medium">Radix UI</Text>
                  <Text size="2" color="gray">Components</Text>
                </Flex>
              </Flex>
            </Flex>
          </Flex>

          {/* Links */}
          <Flex direction="column" gap="4">
            <Heading size="4">Links</Heading>

            <Flex direction="column" gap="2">
              <Card
                variant="surface"
                className="w-full justify-center cursor-pointer hover:bg-[--accent-2]"
                onClick={() => window.open('https://github.com/MayowaObisesan/smart-wallet-pro', '_blank')}
              >
                <Flex align={'center'} gap={'3'}>
                  <Github size={16} className="" />
                  <Text size='2'>View Source Code</Text>
                  <ExternalLink className="ml-auto" size={14} strokeWidth={3} />
                </Flex>
              </Card>

              <Card
                variant="surface"
                className="w-full justify-center cursor-pointer hover:bg-[--accent-2]"
                onClick={() => window.open('mailto:mayowaobi74@gmail.com', '_blank')}
              >
                <Flex align={'center'} gap={'3'}>
                  <Mail size={16} className="" />
                  <Text size='2'>Contact Developer</Text>
                  <ExternalLink className="ml-auto" size={14} strokeWidth={3} />
                </Flex>
              </Card>
            </Flex>
          </Flex>

          {/* Disclaimer */}
          <Flex hidden direction="column" gap="2">
            <Heading size="4">Disclaimer</Heading>
            <Text color="gray" size="2">
              Always back up your accounts and use at your own risk.
              The developer assumes no liability.
            </Text>
          </Flex>


          {/* Footer */}
          <Flex direction="column" align="center" gap="1" className="">
            <Separator size="4" className="mb-4" />
            <Text color="gray" size="2">Made with ❤️ by Mayowa Obisesan</Text>
            <Text color="gray" size="1">&copy; 2025 Wallet Pro. All rights reserved.</Text>
          </Flex>
        </div>
      </PageBody>

      {/* Bottom Navigation */}
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
