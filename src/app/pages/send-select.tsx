import React from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "~components/ui/button"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import { getAllAccounts } from "~services/wallet"
import { useNavigate } from "react-router-dom"
import { PageBody, PageContainer, PageHeader, PageHeading } from "~components/PageContainer"
import type { WalletAccount } from "~/types/account"
import {Text, Select, Flex, Separator, Heading, TextField} from "@radix-ui/themes"
import { AccountList } from "~components/AccountList"
import {AccountBalance} from "~components/AccountBalance";
import {shortenAddress} from "~utils";

export function SendSelectPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = React.useState<WalletAccount[]>([])
  const [fromAccountId, setFromAccountId] = React.useState<string>("")
  const [recipientAddress, setRecipientAddress] = React.useState<string>("")

  React.useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const allAccounts = await getAllAccounts()
      setAccounts(allAccounts)

      console.log("All accounts from send select page:", allAccounts);
      // Set default from account to first available or active account
      if (allAccounts.length > 0) {
        // Try to find active account first
        const activeAccount = allAccounts.find(acc => acc.lastUsed === Math.max(...allAccounts.map(a => a.lastUsed)))
        console.log("Active account from send select page:", activeAccount);
        setFromAccountId(activeAccount?.id || allAccounts[0].id)
      }
    } catch (error) {
      console.error("Error loading accounts:", error)
    }
  }

  // Filter out the from account from available accounts for selection
  const availableToAccounts = accounts.filter(acc => acc.id !== fromAccountId)
  const fromAccount = accounts.find(acc => acc.id === fromAccountId)

  const canProceedWithAddress = fromAccountId && recipientAddress.trim() && recipientAddress.startsWith('0x') && recipientAddress.length === 42
  const canProceed = fromAccountId && (canProceedWithAddress || availableToAccounts.length > 0)

  const handleContinueWithAddress = () => {
    if (!fromAccount || !recipientAddress.trim()) return

    navigate('/send/details', {
      state: {
        fromAccount,
        recipientAddress: recipientAddress.trim()
      }
    })
  }

  const handleContinueWithAccount = (toAccount: WalletAccount) => {
    if (!fromAccount) return

    navigate('/send/details', {
      state: {
        fromAccount,
        toAccount
      }
    })
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>Send Transaction</PageHeading>
      </PageHeader>

      <PageBody>
        <div className="flex-1 overflow-auto pb-16">
        <div className="p-4 max-w-md mx-auto">
          <div className="space-y-6">
            {/* From Account */}
            <div className={'relative'}>
              <Text weight={"bold"}>From</Text>
              <Select.Root size={'3'} value={fromAccountId} onValueChange={setFromAccountId}>
                <Select.Trigger className="h-14 w-full" variant={'soft'}>
                  {/*<Select.Value placeholder="Select account to send from" />*/}
                </Select.Trigger>
                <Select.Content position={'popper'}>
                  {accounts.map((account) => (
                    <Select.Item key={account.id} value={account.id} className="h-14 w-full">
                      <Flex align={'center'} justify={'between'} className="" width={'100%'}>
                        <Flex direction={'column'} gap={'0'}>
                          <Text color={'gray'} size={'1'} className="font-medium">{account.name}</Text>
                          <Text size={'2'}>{shortenAddress(account.address)}</Text>
                        </Flex>
                      </Flex>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              {fromAccount && (
                <div className="absolute top-0 right-0 px-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    {/*<span className="text-sm font-medium">Balance:</span>*/}
                    <Text color={'grass'} size={'2'} weight={'bold'}>
                      <AccountBalance address={fromAccount.address} showSymbol={true} />
                    </Text>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Address Input */}
              <div>
                <Text weight={"bold"}>To</Text>
                <TextField.Root
                  variant={"soft"}
                  size={"3"}
                  placeholder="Recipient Address or ENS..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  style={{ width: "100%" }}
                />
                {/*<Input
                  id="recipient"
                  placeholder="Recipient Address or ENS..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full"
                />*/}
                {/*<Text size="1" color="gray" className="mt-1 block">
                  Enter an external Ethereum address to send to.
                </Text>*/}

                {canProceedWithAddress && (
                  <Button
                    onClick={handleContinueWithAddress}
                    className="w-full mt-3"
                    size="sm"
                  >
                    Continue with Address
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>

              {/* Divider */}
              {/*<div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or send to your account</span>
                </div>
              </div>*/}

              {/* User's Accounts List */}
              {/*<div>
                <Text size="3" weight="bold" className="mb-3 block">
                  Or from your Accounts
                </Text>
                <AccountList
                  accounts={availableToAccounts}
                  onAccountSelect={handleContinueWithAccount}
                />
              </div>*/}

              <Flex direction={"column"} width={'100%'} gap={'5'}>
                <Separator size="4" />
                <Flex direction={"column"} gap={'2'}>
                  <Heading size={"3"}>Or from your Accounts</Heading>
                  <AccountList
                    accounts={availableToAccounts}
                    onAccountSelect={handleContinueWithAccount}
                  />
                </Flex>
              </Flex>
            </div>
          </div>
        </div>
      </PageBody>
    </PageContainer>
  )
}
