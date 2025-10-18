import { useNavigate } from "react-router-dom"
import { ArrowLeft, ExternalLink, Github, Heart, Mail, Zap, Users } from "lucide-react"
import { Button } from "~components/ui/button"
import {Badge, Callout, Flex, Heading, Text} from "@radix-ui/themes"
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
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3 text-center">Bringing Web3 to Everyone</h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Smart Wallet Pro simplifies blockchain interactions by removing the complexity of
              private keys, seed phrases, and gas fees. Built with Account Abstraction,
              powered by Alchemy AA, for the next billion Web3 users.
            </p>
          </div>

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
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg text-center space-y-2">
              <Users className="w-6 h-6 mx-auto text-muted-foreground" />
              <h4 className="font-medium text-sm">No Seed Phrases</h4>
              <p className="text-xs text-muted-foreground">Just email + social login</p>
            </div>

            <div className="p-3 border rounded-lg text-center space-y-2">
              <Zap className="w-6 h-6 mx-auto text-green-600" />
              <h4 className="font-medium text-sm">Gasless TX</h4>
              <p className="text-xs text-muted-foreground">Sponsored transactions</p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h3 className="font-semibold">Connect With Us</h3>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('https://github.com/MayowaObisesan/smart-wallet-pro', '_blank')}
              >
                <Github className="w-4 h-4 mr-3" />
                View Source Code
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('mailto:mayowaobi74@gmail.com', '_blank')}
              >
                <Mail className="w-4 h-4 mr-3" />
                Contact Developer
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="space-y-3">
            <h3 className="font-semibold">Powered By</h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 border rounded-lg space-y-1">
                <div className="text-lg">🧪</div>
                <div className="text-sm font-medium">Alchemy AA</div>
                <div className="text-xs text-muted-foreground">Smart Accounts</div>
              </div>

              <div className="p-3 border rounded-lg space-y-1">
                <div className="text-lg">🔷</div>
                <div className="text-sm font-medium">Viem</div>
                <div className="text-xs text-muted-foreground">Ethereum JS</div>
              </div>

              <div className="p-3 border rounded-lg space-y-1">
                <div className="text-lg">⚛️</div>
                <div className="text-sm font-medium">React</div>
                <div className="text-xs text-muted-foreground">UI Framework</div>
              </div>

              <div className="p-3 border rounded-lg space-y-1">
                <div className="text-lg">💎</div>
                <div className="text-sm font-medium">Radix UI</div>
                <div className="text-xs text-muted-foreground">Components</div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
              ⚠️ This is an experimental wallet. Always back up your accounts and
              use at your own risk. The developer assumes no liability.
            </p>
          </div>

          {/* Footer */}
          <div className="text-center py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Made with ❤️ by Mayowa Obisesan
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              © 2025 Smart Wallet Pro. All rights reserved.
            </p>
          </div>
        </div>
      </PageBody>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </PageContainer>
  )
}
