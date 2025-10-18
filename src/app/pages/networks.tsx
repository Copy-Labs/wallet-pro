import { NetworksTab } from "~components/wallet/networks-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"
import {PageContainer} from "~components/PageContainer";

export function NetworksPage() {
  return (
    <PageContainer>
      {/*<div className="min-h-[600px] w-[375px] flex flex-col">*/}
      <WalletHeader title="Networks" />
      <div className="flex-1 overflow-auto pb-16">
        <NetworksTab />
      </div>
      <BottomNavigation />
      {/*</div>*/}
    </PageContainer>
  )
}
