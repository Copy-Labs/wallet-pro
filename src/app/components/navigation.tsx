import { NavLink } from "react-router-dom"
import {Wallet, Send, Download, ReceiptText, Network, Settings, Coins, ArrowUpDown} from "lucide-react"

import {Button, IconButton, Text} from "@radix-ui/themes";
import {Tooltip} from "@radix-ui/themes/dist/esm";
import {useNetworkType} from "~store/ui-store";
import {E_NetworkType} from "~types/network";
import React from "react";
import {hasSeedPhrase} from "~services/recovery";
import {useNetworkType} from "~store/ui-store";
import {E_NetworkType} from "~types/network";

export function BottomNavigation() {
  const networkType = useNetworkType()
  const [hasBackup, setHasBackup] = React.useState(false)
  React.useEffect(() => {
    const checkBackup = async () => {
      try {
        const backup = await hasSeedPhrase()
        setHasBackup(backup)
      } catch (error) {
        console.error("Error checking backup status:", error)
      }
    }
    checkBackup()
  }, [])

  return (
    <nav className="sticky bottom-0 left-0 right-0 border-t border-gray12 z-10 bg-grayA6 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-1">
        <Button asChild variant={'ghost'}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:tex-grass5 hover:bg-grayA4"
              }`
            }
          >
            <Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,120v96H152V152H104v64H40V120a8,8,0,0,1,2.34-5.66l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,216,120Z" opacity="0.2"></path><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"></path></svg>
            </Text>
            <span className="text-xs font-medium truncate">Home</span>
          </NavLink>
        </Button>

        <Button asChild variant={'ghost'}>
          <NavLink
            to="/accounts"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:tex-grass5 hover:bg-grayA4"
              }`
            }
          >
            {/*<Wallet className="w-5 h-5 mb-1" />*/}
            <Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z" opacity="0.2"></path><path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path></svg>
            </Text>
            <span className="text-xs font-medium truncate">Accounts</span>
          </NavLink>
        </Button>

        {
          networkType === E_NetworkType.MAINNET
          && <Button asChild hidden variant={'ghost'}>
                <NavLink
                    to="/swap"
                    className={({isActive}) =>
                      `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                        isActive
                          ? "text-grass7"
                          : "hover:bg-grayA4"
                      }`
                    }
                >
                    <ArrowUpDown className="w-5 h-5 mb-1"/>
                    <span className="text-xs font-medium truncate">Swap</span>
                </NavLink>
            </Button>
        }

        <Button asChild variant={'ghost'}>
          <NavLink
            to="/send"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:bg-grayA4"
              }`
            }
          >
            {/*<Send className="w-5 h-5 mb-1" />*/}
            <Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M223.69,42.18l-58.22,192a8,8,0,0,1-14.92,1.25L108,148,20.58,105.45a8,8,0,0,1,1.25-14.92l192-58.22A8,8,0,0,1,223.69,42.18Z" opacity="0.2"></path><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"></path></svg>
            </Text>
            <span className="text-xs font-medium truncate">Send</span>
          </NavLink>
        </Button>

        <Button hidden variant={'ghost'}>
          <NavLink
            to="/networks"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:bg-grayA4"
              }`
            }
          >
            {/*<Send className="w-5 h-5 mb-1" />*/}
            <Text>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M144,204a16,16,0,1,1-16-16A16,16,0,0,1,144,204ZM239.61,83.91a176,176,0,0,0-223.22,0,12,12,0,1,0,15.23,18.55,152,152,0,0,1,192.76,0,12,12,0,1,0,15.23-18.55Zm-32.16,35.73a128,128,0,0,0-158.9,0,12,12,0,0,0,14.9,18.81,104,104,0,0,1,129.1,0,12,12,0,0,0,14.9-18.81ZM175.07,155.3a80.05,80.05,0,0,0-94.14,0,12,12,0,0,0,14.14,19.4,56,56,0,0,1,65.86,0,12,12,0,1,0,14.14-19.4Z"></path></svg>
            </Text>
            <span className="text-xs font-medium truncate">Network</span>
          </NavLink>
        </Button>

        <Button hidden variant={'ghost'}>
          <NavLink
            to="/receive"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:bg-grayA4"
              }`
            }
          >
            <Download className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium truncate">Receive</span>
          </NavLink>
        </Button>

        <Button asChild variant={'ghost'}>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:bg-grayA4"
              }`
            }
          >
            <ReceiptText className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium truncate">History</span>
          </NavLink>
        </Button>

        <Button asChild variant={'ghost'}>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? "text-grass7"
                  : "hover:bg-grayA4"
              }`
            }
          >
            {/*<Settings className="w-5 h-5 mb-1" />*/}
            <Text className={'relative'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M230.1,108.76,198.25,90.62c-.64-1.16-1.31-2.29-2-3.41l-.12-36A104.61,104.61,0,0,0,162,32L130,49.89c-1.34,0-2.69,0-4,0L94,32A104.58,104.58,0,0,0,59.89,51.25l-.16,36c-.7,1.12-1.37,2.26-2,3.41l-31.84,18.1a99.15,99.15,0,0,0,0,38.46l31.85,18.14c.64,1.16,1.31,2.29,2,3.41l.12,36A104.61,104.61,0,0,0,94,224l32-17.87c1.34,0,2.69,0,4,0L162,224a104.58,104.58,0,0,0,34.08-19.25l.16-36c.7-1.12,1.37-2.26,2-3.41l31.84-18.1A99.15,99.15,0,0,0,230.1,108.76ZM128,168a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z" opacity="0.2"></path><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm109.94-52.79a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A111.92,111.92,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.63a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21Zm-15,34.91-28.57,16.25a8,8,0,0,0-3,3c-.58,1-1.19,2.06-1.81,3.06a7.94,7.94,0,0,0-1.22,4.21l-.15,32.25a95.89,95.89,0,0,1-25.37,14.3L134,199.13a8,8,0,0,0-3.91-1h-.19c-1.21,0-2.43,0-3.64,0a8.1,8.1,0,0,0-4.1,1l-28.84,16.1A96,96,0,0,1,67.88,201l-.11-32.2a8,8,0,0,0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.09,8.09,0,0,0-3-3.06l-28.6-16.29a90.49,90.49,0,0,1,0-28.26L61.67,97.63a8,8,0,0,0,3-3c.58-1,1.19-2.06,1.81-3.06a7.94,7.94,0,0,0,1.22-4.21l.15-32.25a95.89,95.89,0,0,1,25.37-14.3L122,56.87a8,8,0,0,0,4.1,1c1.21,0,2.43,0,3.64,0a8,8,0,0,0,4.1-1l28.84-16.1A96,96,0,0,1,188.12,55l.11,32.2a8,8,0,0,0,1.22,4.22c.62,1,1.23,2,1.8,3.06a8.09,8.09,0,0,0,3,3.06l28.6,16.29A90.49,90.49,0,0,1,222.9,142.12Z"></path></svg>
              {!hasBackup && (
                <Tooltip content={"You need to backup your account"}>
                  <IconButton
                    className="md:hidden absolute -top-2 -right-2"
                    radius={'full'}
                    size={'1'}
                    variant={'ghost'}
                    onClick={() => window.location.href = '/tabs/backup-seed.html'}
                  >
                    <Text color={'yellow'}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"></path></svg>
                    </Text>
                  </IconButton>
                </Tooltip>
              )}
            </Text>
            <span className="text-xs font-medium truncate">Settings</span>
          </NavLink>
        </Button>
      </div>
    </nav>
  )
}
