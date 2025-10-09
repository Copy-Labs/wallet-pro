import { NavLink } from "react-router-dom"
import { Wallet, Send, Download, ReceiptText, Network, Settings } from "lucide-react"

export function BottomNavigation() {
  return (
    <nav className="sticky bottom-0 left-0 right-0 border-t border-blackA8 z-10">
      <div className="flex items-center justify-around px-2 py-1">
        <NavLink
          to="/accounts"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
              isActive
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-grayA4"
            }`
          }
        >
          <Wallet className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium truncate">Accounts</span>
        </NavLink>

        <NavLink
          to="/send"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
              isActive
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-grayA4"
            }`
          }
        >
          <Send className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium truncate">Send</span>
        </NavLink>

        <NavLink
          to="/receive"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
              isActive
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-grayA4"
            }`
          }
        >
          <Download className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium truncate">Receive</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
              isActive
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-grayA4"
            }`
          }
        >
          <ReceiptText className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium truncate">History</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
              isActive
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-grayA4"
            }`
          }
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium truncate">Settings</span>
        </NavLink>
      </div>
    </nav>
  )
}
