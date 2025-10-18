import { Routes, Route } from "react-router-dom"

// Import page components
import { AccountsPage } from "./pages/accounts"
import { SendSelectPage } from "./pages/send-select"
import { SendDetailsPage } from "./pages/send"
import { ReceivePage } from "./pages/receive"
import { TransactionsPage } from "./pages/transactions"
import { NetworksPage } from "./pages/networks"
import { SettingsPage } from "./pages/settings"

// Import custom network page components
import { CustomNetworksPage } from "./pages/custom-networks"
import { AddCustomNetworkPage } from "./pages/add-custom-network"
import { EditCustomNetworkPage } from "./pages/edit-custom-network"
import { ChainListExplorer } from "~/components/ChainListExplorer"

// Nested settings pages
import { SettingsAboutPage } from "./pages/settings/about"
import { SettingsAccountsPage } from "./pages/settings/accounts"
import { SettingsGasPage } from "./pages/settings/gas"
import { SettingsLogsPage } from "./pages/settings/logs"
import { SettingsPreferencesPage } from "./pages/settings/preferences"
import {SettingsThemesPage} from "~app/pages/settings/themes";
import {HomePage} from "~app/pages/home";
import ChainListExplorerDetailsPage from "~components/ChainListDetails";

export function WalletRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/accounts" element={<AccountsPage />} />
      <Route path="/send" element={<SendSelectPage />} />
      <Route path="/send/details" element={<SendDetailsPage />} />
      <Route path="/receive" element={<ReceivePage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/networks" element={<NetworksPage />} />

      {/* Custom network nested routes */}
      <Route path="/networks/custom" element={<CustomNetworksPage />} />
      <Route path="/networks/add" element={<AddCustomNetworkPage />} />
      <Route path="/networks/edit/:id" element={<EditCustomNetworkPage />} />

      {/* ChainList routes */}
      <Route path="/networks/chainlist" element={<ChainListExplorer />} />
      {/*<Route path="/networks/chainlist/:chainId" element={<ChainListDetailsPage />} />*/}
      <Route path="/networks/chainlist/:chainId" element={<ChainListExplorerDetailsPage />} />

      {/* Main settings page */}
      <Route path="/settings" element={<SettingsPage />} />

      {/* Nested settings pages */}
      <Route path="/settings/accounts" element={<SettingsAccountsPage />} />
      <Route path="/settings/gas" element={<SettingsGasPage />} />
      <Route path="/settings/logs" element={<SettingsLogsPage />} />
      <Route path="/settings/preferences" element={<SettingsPreferencesPage />} />
      <Route path="/settings/themes" element={<SettingsThemesPage />} />
      <Route path="/settings/about" element={<SettingsAboutPage />} />
    </Routes>
  )
}
