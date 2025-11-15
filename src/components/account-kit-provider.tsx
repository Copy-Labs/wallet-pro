import React from "react"
import { AlchemyAccountProvider } from "@account-kit/react"
import { createAccountKitConfig } from "~config/account-kit"
import type {QueryClient} from "@tanstack/react-query";

interface AccountKitProviderProps {
  client: QueryClient
  children: React.ReactNode
}

export function AccountKitProvider({ client, children }: AccountKitProviderProps) {
  const config = createAccountKitConfig()

  return (
    <AlchemyAccountProvider config={config} queryClient={client}>
      {children}
    </AlchemyAccountProvider>
  )
}
