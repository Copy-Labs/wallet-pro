import {type AlchemyAccountsUIConfig, createConfig } from "@account-kit/react"
import { alchemy, defineAlchemyChain } from "@account-kit/infra"
import { getChainById, defaultChain } from "./chains"
import {useSelectedNetwork, useUIStore} from "~store/ui-store"
import { ACCOUNT_KIT_CHAIN_MAP } from "~services/wallet"
import type {NetworkConfig} from "~types/network";
import type { Chain } from "viem";

// UI Configuration for Email OTP authentication
export const uiConfig: AlchemyAccountsUIConfig = {
  auth: {
    sections: [
      [
        // Include passkey in a section
        { type: "passkey" },
        {
          type: "email",
          emailMode: "otp",
          // Optional customizations:
          buttonLabel: "Continue with Email",
          placeholder: "Enter your email address",
        },
      ],
    ],
    // Add social login options if needed
    addPasskeyOnSignup: true, // Disable passkey for extension
  },
  // Disable embedded wallet UI since we're building custom UI
  // wallet: {
  //   showSignInWithEmail: false,
  //   showSignInWithPasskey: false,
  // },
}

/**
 * Create Account Kit configuration synchronously
 * This function uses the selected network from the UI store and wraps it with Alchemy RPC URLs
 */
export function createAccountKitConfig() {
  const selectedNetwork = useSelectedNetwork();

  console.log("[CreateAccountKitConfig] Selected network:", selectedNetwork.name, selectedNetwork.id)

  // Check if this chain is in the Account Kit map and use the official alchemy URL
  const accountKitChain = ACCOUNT_KIT_CHAIN_MAP[selectedNetwork.id]
  const rpcBaseUrl = accountKitChain
    ? accountKitChain.rpcUrls.alchemy.http[0]  // Use official alchemy URL from the chain
    : selectedNetwork.rpcUrls.default.http[0] // `https://eth-${selectedNetwork.id}.g.alchemy.com/v2`  // Fallback for unmapped chains

  console.log("[CreateAccountKitConfig] Using RPC URL:", rpcBaseUrl)

  // Wrap the selected network with Alchemy RPC URLs to make it compatible with Account Kit
  const alchemyChain = defineAlchemyChain({
    chain: selectedNetwork,
    rpcBaseUrl,
  })

  return createConfig(
    {
      transport: alchemy({
        apiKey: process.env.PLASMO_PUBLIC_ALCHEMY_API_KEY || "",
      }),
      chain: alchemyChain,
      // Optional: Configure session management
      sessionConfig: {
        // Session will be managed by our custom auth service
      },
    },
    uiConfig,
  )
}

// Export types for use in components
export type { AlchemyAccountsUIConfig }
