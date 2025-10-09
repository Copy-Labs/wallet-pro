import { SettingsTab } from "~components/wallet/settings-tab"
import { WalletHeader } from "~components/wallet/wallet-header"
import { BottomNavigation } from "~app/components/navigation"

export function SettingsPage() {
  return (
    <div className="min-h-[600px] w-[375px] flex flex-col bg-white">
      <WalletHeader title="Settings" />
      <div className="flex-1 overflow-auto pb-16">
        <SettingsTab />
      </div>
      <BottomNavigation />
    </div>
  )
}
