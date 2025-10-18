import React from "react"
import { CreateAccountDialog } from "./CreateAccountDialog"

// Test component to demonstrate self-contained (standalone) usage
export function TestCreateAccountDialog() {
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Standalone CreateAccountDialog Test</h2>
      <p className="mb-4">
        This dialog works entirely on its own - no parent callbacks needed.
        It will handle account creation, success feedback, and state updates internally.
      </p>

      <CreateAccountDialog
        triggerLabel="Create Standalone Account"
        description="This is a standalone dialog that handles everything internally"
        placeholder="e.g., Standalone Account"
      />
    </div>
  )
}
