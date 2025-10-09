import { NetworksTab } from "~components/wallet/networks-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"

export function NetworksPage() {
  return (
    <div className="min-h-[600px] w-[375px] flex flex-col bg-white">
      <WalletHeader title="Networks" />
      <div className="flex-1 overflow-auto pb-16">
        <NetworksTab />
      </div>
      <BottomNavigation />
    </div>
  )
}
