import { useNavigate } from "react-router-dom"
import { ArrowLeft, ExternalLink, Github, Heart, Mail, Zap, Users } from "lucide-react"
import { Button } from "~components/ui/button"
import {
  Badge,
  Callout,
  Card,
  Flex,
  Grid,
  Heading,
  Inset,
  Text,
  Separator
} from "@radix-ui/themes"
import { BottomNavigation } from "~app/components/navigation"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";

export function SettingsAboutPage() {
  const navigate = useNavigate()

  // Get app version from package.json
  const appVersion = "1.0.0"
  const buildDate = new Date().toLocaleDateString()

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader>
        <PageHeading>About</PageHeading>
      </PageHeader>

      <PageBody>
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* App Info */}
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-gradient-to-br from-grass5 to-grass6 rounded-2xl flex items-center justify-center mx-auto">
              <Text color={'gray'}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 256 256"><path d="M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z" opacity="0.2"></path><path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path></svg>
              </Text>
            </div>

            <Flex direction={'column'} gap={'1'}>
              <Heading size={'3'}>Smart Wallet Pro</Heading>
              <Text color={'gray'} size={'2'}>Version {appVersion}</Text>
              <Text color={'gray'} size={'1'} weight={'medium'}>Built on {buildDate}</Text>
            </Flex>

            <Badge color="green" variant="soft" size="1" radius={'medium'}>
              ✨ Account Abstraction Ready
            </Badge>
          </div>

          {/* Description */}
          <Card>
            <Inset>
              <Flex direction="column" gap="3" justify="center">
                <Heading size="4" align="center">Bringing Web3 to Everyone</Heading>
                <Text size="2" align="center">
                  Smart Wallet Pro simplifies blockchain interactions by removing the complexity of
                  private keys, seed phrases, and gas fees. Built with Account Abstraction,
                  powered by Alchemy AA, for the next billion Web3 users.
                </Text>
              </Flex>
            </Inset>
          </Card>

          {/* Mission */}
          <Callout.Root color="green" size="1">
            <Callout.Icon>
              <Heart />
            </Callout.Icon>
            <Callout.Text>
              <strong>Our Mission:</strong> Democratize access to Web3 by abstracting every complexity,
              making blockchain technology accessible to non-technical users worldwide.
            </Callout.Text>
          </Callout.Root>

          {/* Features */}
          <Grid columns="2" gap="3">
            <Card>
              <Inset>
                <Flex direction="column" gap="2" align="center">
                  <Text size="4"><Users /></Text>
                  <Heading size="4">No Seed Phrases</Heading>
                  <Text size="1" color="gray">Just email + social login</Text>
                </Flex>
              </Inset>
            </Card>

            <Card>
              <Inset>
                <Flex direction="column" gap="2" align="center">
                  <Text size="4" color="green"><Zap /></Text>
                  <Heading size="4">Gasless TX</Heading>
                  <Text size="1" color="gray">Sponsored transactions</Text>
                </Flex>
              </Inset>
            </Card>
          </Grid>

          {/* Links */}
          <Card>
            <Inset>
              <Flex direction="column" gap="3">
                <Heading size="4">Connect With Us</Heading>

                <Flex direction="column" gap="2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('https://github.com/MayowaObisesan/smart-wallet-pro', '_blank')}
                  >
                    <Github size={16} />
                    View Source Code
                    <ExternalLink size={16} />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open('mailto:mayowaobi74@gmail.com', '_blank')}
                  >
                    <Mail size={16} />
                    Contact Developer
                    <ExternalLink size={16} />
                  </Button>
                </Flex>
              </Flex>
            </Inset>
          </Card>

          {/* Tech Stack */}
          <Card>
            <Inset>
              <Flex direction="column" gap="4">
                <Heading size="4">Powered By</Heading>

                <Grid columns="2" gap="3">
                  <Card variant="ghost">
                    <Inset>
                      <Flex direction="column" gap="1" align="center">
                        <Text size="6">🧪</Text>
                        <Heading size="4">Alchemy AA</Heading>
                        <Text size="1" color="gray">Smart Accounts</Text>
                      </Flex>
                    </Inset>
                  </Card>

                  <Card variant="ghost">
                    <Inset>
                      <Flex direction="column" gap="1" align="center">
                        <Text size="6">🔷</Text>
                        <Heading size="4">Viem</Heading>
                        <Text size="1" color="gray">Ethereum JS</Text>
                      </Flex>
                    </Inset>
                  </Card>

                  <Card variant="ghost">
                    <Inset>
                      <Flex direction="column" gap="1" align="center">
                        <Text size="6">⚛️</Text>
                        <Heading size="4">React</Heading>
                        <Text size="1" color="gray">UI Framework</Text>
                      </Flex>
                    </Inset>
                  </Card>

                  <Card variant="ghost">
                    <Inset>
                      <Flex direction="column" gap="1" align="center">
                        <Text size="6">💎</Text>
                        <Heading size="4">Radix UI</Heading>
                        <Text size="1" color="gray">Components</Text>
                      </Flex>
                    </Inset>
                  </Card>
                </Grid>
              </Flex>
            </Inset>
          </Card>

          {/* Disclaimer */}
          <Callout.Root color="yellow" size="1">
            <Callout.Icon />
            <Callout.Text>
              This is an experimental wallet. Always back up your accounts and
              use at your own risk. The developer assumes no liability.
            </Callout.Text>
          </Callout.Root>

          {/* Footer */}
          <Separator size="4" />
          <Flex direction="column" gap="1" align="center">
            <Text size="2" color="gray">
              Made with ❤️ by Mayowa Obisesan
            </Text>
            <Text size="1" color="gray">
              © 2025 Smart Wallet Pro. All rights reserved.
            </Text>
          </Flex>
        </div>
      </PageBody>

      {/* Bottom Navigation */}
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
