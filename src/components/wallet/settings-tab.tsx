import React from "react"
import { Settings } from "lucide-react"

export function SettingsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <Settings className="w-16 h-16 mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Settings</h3>
      <p className="text-sm text-muted-foreground text-center">
        Settings and preferences will be implemented in Week 5
      </p>
    </div>
  )
}
