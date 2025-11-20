import type { WalletAccount } from "~/types/account";
import { useUIStore, useActiveAccount } from "~/store/ui-store";
import { switchAccount } from "~/services/wallet";
import {Check, Copy} from "lucide-react";
import {Avatar, Badge, Card, ContextMenu, Flex, Section, Text} from "@radix-ui/themes";
import {formatBalance, shortenAddress} from "~/utils";
import CopyTextComponent from "~/components/CopyToClipboard";
import {AccountBalance} from "~components/AccountBalance";
import React from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";

export const AccountList = ({
  accounts,
  onAccountSelect
}: {
  accounts: WalletAccount[]
  onAccountSelect?: (account: WalletAccount) => void
}) => {
  const navigate = useNavigate();
  const activeAccountId = useUIStore((state) => state.activeAccount?.id);

  const handleGoToWallet = async (account: WalletAccount) => {
    if (onAccountSelect) {
      // Custom selection handler (for send page)
      onAccountSelect(account)
    } else {
      // Default behavior (for accounts page)
      try {
        await switchAccount(account.id)
        // Active account will be updated automatically by the storage watcher
        toast.success(`${account.name} is selected`, {
          closeButton: false,
          duration: 800,
          position: 'top-center',
        })

        // Go to the Home page
        navigate('/')
      } catch (error) {
        console.error("Error switching account:", error)
      }
    }
  }

  return (
    // <Section size={"1"} flexGrow={"1"}>
      <Flex direction={"column"} gap={"3"}>
        {accounts?.map((eachAccount) => {
          const isActive = activeAccountId === eachAccount.id

          return (
            <ContextMenu.Root key={eachAccount.id}>
              <ContextMenu.Trigger>
                <Card
                  variant="surface"
                  size="1"
                  className={"cursor-pointer"}
                  onClick={() => handleGoToWallet(eachAccount)}
                >
                  <Flex gap="3" align="center" width={"100%"}>
                    {/*<Avatar size="3" radius="full" fallback="" color="indigo" />*/}
                    <Flex justify={"between"} align={"center"} width={"100%"}>
                      <Flex direction={"column"} align={"start"}>
                        <Flex align="center" gap="2">
                          <Text as="div" size="2" weight="bold">
                            {eachAccount.name}
                          </Text>
                          {isActive && <Badge variant="solid" radius="full" color="green" size={'1'} style={{ fontWeight: "bold" }}>
                              Active
                          </Badge>}
                        </Flex>
                        <Flex justify={"between"} align={"center"} gap={"2"}>
                          <Text as="div" color="gray" weight={"bold"}>
                            {shortenAddress(eachAccount.address)}
                          </Text>
                          <CopyTextComponent
                            textToCopy={eachAccount.address}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40V168H168V88H88V40Z" opacity="0.2"></path><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path></svg>}
                            successIcon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="green" viewBox="0 0 256 256"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"></path></svg>}
                          >
                          </CopyTextComponent>
                        </Flex>
                      </Flex>
                      <Text as="div" color="gray" weight={"bold"}>
                        <AccountBalance address={eachAccount.address} />
                      </Text>
                    </Flex>
                  </Flex>
                </Card>
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Item>
                  <CopyTextComponent textToCopy={eachAccount.address}>
                    <Flex justify={"between"} align={"center"} gap={"2"}>
                      Copy Address
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40V168H168V88H88V40Z" opacity="0.2"></path><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path></svg>
                    </Flex>
                  </CopyTextComponent>
                </ContextMenu.Item>
                <ContextMenu.Item shortcut="⌘ E">Edit Name</ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item shortcut="⌘ N">Archive</ContextMenu.Item>

                <ContextMenu.Sub>
                  <ContextMenu.SubTrigger>More</ContextMenu.SubTrigger>
                  <ContextMenu.SubContent>
                    <ContextMenu.Item>Move to project…</ContextMenu.Item>
                    <ContextMenu.Item>Move to folder…</ContextMenu.Item>
                    <ContextMenu.Separator />
                    <ContextMenu.Item>Advanced options…</ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Sub>

                <ContextMenu.Separator />
                <ContextMenu.Item>Share</ContextMenu.Item>
                <ContextMenu.Item>Add to favorites</ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.Item shortcut="⌘ ⌫" color="red">
                  Delete
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          )
        })}
      </Flex>
    // </Section>
  )
}
