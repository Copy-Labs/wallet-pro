import { AccountsTab } from "~components/wallet/accounts-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {Button, Flex, Text} from "@radix-ui/themes";
import {LucidePlus} from "lucide-react";
import { NavLink } from "react-router-dom";
import QRCode from "~components/QRCode/QRCode";

export function AccountsPage() {
  return (
    <div className="min-h-[600px] w-[375px] flex flex-col">
      <WalletHeader title="Smart Wallet Pro" />
      <Flex align={"center"} justify={"between"} width={"100%"}>
        <QRCode />
        <Flex align={"center"} gap={"3"}>
          <Button asChild variant={"soft"}>
            <NavLink to={"/networks/new"}>
              <LucidePlus size={16} strokeWidth={3} />
              <Text>Add Network</Text>
            </NavLink>
          </Button>
          {/*<ProfileDropdown />*/}
        </Flex>
      </Flex>
      <div className="flex-1 overflow-auto pb-16">
        <AccountsTab />
      </div>
      <BottomNavigation />
    </div>
  )
}
