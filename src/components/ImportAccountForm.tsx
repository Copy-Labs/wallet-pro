import React, { useState } from "react"
import { Key, BookOpen } from "lucide-react"
import {Button, Flex, TextField, Text, Card, Separator, TextArea, Select} from "@radix-ui/themes"
import { Label } from "~components/ui/label"
import type { WalletAccount } from "~/types/account"
import { toast } from "sonner"
import { importAccountFromPrivateKey, importAccountsFromSeedPhrase } from "~/services/wallet"
import {cn} from "~lib/utils";

type ImportMethod = 'privateKey' | 'seedPhrase'

interface ImportAccountFormProps {
  onImportSuccess?: (accounts: WalletAccount[]) => void
  onCancel?: () => void
  showCancelButton?: boolean
}

export function ImportAccountForm({
  onImportSuccess,
  onCancel,
  showCancelButton = true
}: ImportAccountFormProps) {
  const [method, setMethod] = useState<ImportMethod>('privateKey')
  const [accountName, setAccountName] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [seedPhrase, setSeedPhrase] = useState("")
  const [accountCount, setAccountCount] = useState(1)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState("")

  const handleImport = async () => {
    setError("")

    if (!accountName.trim()) {
      setError("Account name is required")
      return
    }

    setIsImporting(true)

    try {
      let accounts: WalletAccount[]

      if (method === 'privateKey') {
        if (!privateKey.trim()) {
          setError("Private key is required")
          return
        }

        const account = await importAccountFromPrivateKey(accountName.trim(), privateKey.trim())
        accounts = [account]
        toast.success(`${account.name} imported successfully!`)
      } else {
        if (!seedPhrase.trim()) {
          setError("Seed phrase is required")
          return
        }

        const importedAccounts = await importAccountsFromSeedPhrase(
          accountName.trim(),
          seedPhrase.trim(),
          accountCount
        )
        accounts = importedAccounts
        toast.success(`${importedAccounts.length} account(s) imported successfully!`)
      }

      // Call success callback if provided
      onImportSuccess?.(accounts)

      // Reset form
      setAccountName("")
      setPrivateKey("")
      setSeedPhrase("")
      setAccountCount(1)
    } catch (err: any) {
      console.error("Import failed:", err)
      setError(err.message || "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  const renderPrivateKeyForm = () => (
    <div className="space-y-4">
      <Flex direction={'column'} gap={'2'}>
        <Label htmlFor="privateKey">Private Key (64 hex characters)</Label>
        <TextField.Root
          className={'h-[56px]'}
          id="privateKey"
          size={'3'}
          type="password"
          placeholder="0x1234567890abcdef..."
          value={privateKey}
          variant={'soft'}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
        <Text color={'gray'} size="2" className="text-muted-foreground mt-1">
          Enter your private key. <br/>
          It will be stored securely in this wallet.
        </Text>
      </Flex>
    </div>
  )

  const renderSeedPhraseForm = () => (
    <div className="space-y-8">
      <Flex direction={'column'} gap={'2'}>
        <Label htmlFor="seedPhrase">Seed Phrase (12 words)</Label>
        <TextArea
          id="seedPhrase"
          placeholder="word1 word2 word3 ..."
          rows={4}
          size="3"
          value={seedPhrase}
          variant={'soft'}
          onChange={(e) => setSeedPhrase(e.target.value)}
        />
        <Text color={'gray'} size="2" className="text-muted-foreground mt-1">
          Enter your 12-word seed phrase, separated by spaces.
        </Text>
      </Flex>

      <Flex direction={'column'} gap={'2'}>
        <Label htmlFor="accountCount">Number of Accounts to Import</Label>
        <Select.Root
          defaultValue={'1'}
          size="3"
          onValueChange={(value) => setAccountCount(parseInt(value))}
        >
          <Select.Trigger variant={'soft'} />
          <Select.Content>
            {[1, 2, 3, 4, 5].map(count => (
              <Select.Item key={count} value={count.toString()}>
                {count} account{count > 1 ? 's' : ''}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Text color={'gray'} size="2" className="text-muted-foreground mt-1">
          Import multiple accounts derived from this seed phrase.
        </Text>
      </Flex>
    </div>
  )

  return (
    <Flex direction={'column'} className="space-y-4" p={'4'}>
      {/* Import Method Selection */}
      <Label>Choose Import Method</Label>
      <div>
        <Flex className="" gap={'4'}>
          <Card
            className={cn('flex-1 cursor-pointer', method === 'privateKey' ? 'bg-grassA7 border-transparent' : '')}
            size={'2'}
            onClick={() => setMethod('privateKey')}
          >
            <Key size={16} />
            <Text size={'3'} weight={'medium'}>Private Key</Text>
          </Card>

          <Card
            className={cn('flex-1 cursor-pointer', method === 'seedPhrase' ? 'bg-grassA7 border-transparent' : '')}
            size={'2'}
            onClick={() => setMethod('seedPhrase')}
          >
            <BookOpen size={16} />
            <Text size={'3'} weight={'medium'}>Seed Phrase</Text>
          </Card>
        </Flex>
      </div>

      <Flex direction={'column'} gap={'4'} py={'2'}>
        <Separator my={'3'} size={'4'} />
        {/* Method-specific form */}
        {method === 'privateKey' ? renderPrivateKeyForm() : renderSeedPhraseForm()}

        {/* Account Name */}
        <Flex direction={'column'} gap={'2'}>
          <Label htmlFor="accountName">Account Name</Label>
          <TextField.Root
            className={'h-[56px]'}
            id="accountName"
            placeholder="e.g., My Dev Account"
            size={'3'}
            value={accountName}
            variant={'soft'}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </Flex>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <Text size="2" color="red">{error}</Text>
          </div>
        )}
      </Flex>

      <Flex gap="3" mt="1" justify="end">
        {showCancelButton && (
          <Button variant="soft" color="gray" disabled={isImporting} onClick={onCancel}>
            Cancel
          </Button>
        )}

        <Button
          color="grass"
          size={'2'}
          onClick={handleImport}
          disabled={isImporting || !accountName.trim()}
        >
          {isImporting ? 'Importing...' : 'Import Account'}
        </Button>
      </Flex>
    </Flex>
  )
}
