import React, { useState, useEffect } from "react"
import { getChainLogoUrl } from "~/services/blockscout-registry"
import {Avatar} from "@radix-ui/themes/dist/esm";

/**
 * Chain icon component that handles async loading from predefined + Blockscout sources
 * @param chainId The chain ID to display icon for
 * @param className Optional CSS classes for the icon
 * @param size Optional size (default: "w-4 h-4")
 */
export function ChainIcon({ chainId, className = "", size = "w-4 h-4" }: {
  chainId: number
  className?: string
  size?: string
}) {
  const [iconSrc, setIconSrc] = useState<string>("⟠")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadIcon = async () => {
      try {
        // Load Blockscout registry first, as it has more comprehensive coverage
        const blockscoutIcon = await getChainLogoUrl(chainId)
        if (mounted) {
          setIconSrc(blockscoutIcon || "⟠")
          setIsLoading(false)
        }
      } catch (error) {
        console.warn(`[Chain Icon] Failed to get Blockscout icon for chain ${chainId}:`, error)
        if (mounted) {
          setIconSrc("⟠")
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
    loadIcon()

    return () => { mounted = false }
  }, [chainId])

  if (isLoading) {
    return <div className={`animate-pulse bg-gray-300 rounded ${size} ${className}`} />
  }

  if (iconSrc.startsWith('http')) {
    return (
      /*<img
        src={iconSrc}
        alt={`Chain ${chainId} icon`}
        className={`${size} ${className}`}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const fallback = document.createElement('span')
          fallback.textContent = '⟠'
          fallback.className = 'text-sm'
          if (target.parentNode) {
            target.parentNode.appendChild(fallback)
          }
        }}
      />*/
      <Avatar
        alt={`Chain ${chainId} icon`}
        className={`${size} ${className}`}
        fallback={chainId.toString()?.trim().substring(0, 1).toUpperCase()}
        radius="full"
        size="3"
        src={iconSrc}
      />
    )
  }

  // Emoji fallback
  return <span className={`text-sm ${className}`}>{iconSrc}</span>
  // return <Avatar radius={'full'} size={'1'} fallback={iconSrc} className={`text-sm ${className}`} variant={'soft'} />
}
