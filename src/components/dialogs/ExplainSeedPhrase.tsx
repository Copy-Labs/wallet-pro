import {AlertDialog, Button, Flex, IconButton, Strong, Text} from "@radix-ui/themes";
import {LucideX} from "lucide-react";
import React from "react";

export function ExplainSeedPhrase() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button
          color={'grass'}
          radius={'full'}
          variant={'soft'}
        >
          <Text>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M144,176a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128ZM124,96a12,12,0,1,0-12-12A12,12,0,0,0,124,96Z"></path></svg>
          </Text>
          What is a Seed Phrase ?
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>What is a Seed Phrase?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          <ol className={'list-decimal space-y-4 px-4'}>
            <li>
              It is a series of 12 or 24 words that acts as a master key to your wallet.
            </li>
            <li>
              Anyone with access can use it to recover access to your funds ANYDAY, ANYTIME.
            </li>
            <li>
              <Strong>STORE IT SECURELY</Strong>
            </li>
            <li>
              <strong>Warning:</strong> Never share your seed phrase with anyone!
            </li>
          </ol>
        </AlertDialog.Description>

        <Flex className={'absolute top-2 right-2'} gap="3" justify="end">
          <AlertDialog.Cancel>
            <IconButton variant="solid" color="red" radius={'full'} size={'1'}>
              <LucideX size={14} strokeWidth={3} />
            </IconButton>
          </AlertDialog.Cancel>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>

  )
}

