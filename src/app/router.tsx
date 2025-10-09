import { Routes, Route } from "react-router-dom"

// Import page components
import { AccountsPage } from "./pages/accounts"
import { SendPage } from "./pages/send"
import { ReceivePage } from "./pages/receive"
import { TransactionsPage } from "./pages/transactions"
import { NetworksPage } from "./pages/networks"
import { SettingsPage } from "./pages/settings"

export function WalletRouter() {
  return (
    <Routes>
      <Route path="/" element={<AccountsPage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="/send" element={<SendPage />} />
      <Route path="/receive" element={<ReceivePage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/networks" element={<NetworksPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}
