import { Text } from "@radix-ui/themes";
import { useNetworkState } from "@uidotdev/usehooks"
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useUIStore } from "~/store/ui-store";
import { fetchAccountBalance } from "~/services/balance";
import { getSelectedNetwork } from "~/utils/storage";
import { getChainById, defaultChain } from "~/config/chains";
import { formatBalance } from "~/utils";

interface AccountBalanceProps {
    address: string;
}

// Memoized AccountBalance component
const AccountBalanceComponent = ({ address }: AccountBalanceProps) => {
    const { selectedNetwork, walletLocked, balanceVersion } = useUIStore()
    const [accountBalance, setAccountBalance] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const network = useNetworkState();

    // Memoize the getBalance function to avoid unnecessary re-creation
    const getBalance = useCallback(async () => {
        if (!address || walletLocked) return;

        setIsLoading(true);
        try {
            const chainId = await getSelectedNetwork();
            const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain;
            const balance = await fetchAccountBalance(address as `0x${string}`, chain);
            setAccountBalance(balance.eth);
        } catch (error) {
            console.error("Error fetching balance:", error);
            toast.error("Error fetching balance");
            setAccountBalance("0");
        } finally {
            setIsLoading(false);
        }
    }, [address, walletLocked]);

    useEffect(() => {
        if (network.online && !walletLocked && selectedNetwork) {
            getBalance();
        }
    }, [network, getBalance, walletLocked, selectedNetwork, balanceVersion]);

    const displayBalance = accountBalance ? formatBalance(accountBalance) : isLoading ? "..." : "0.000000";

    return <Text>{displayBalance} ETH</Text>;
};

// AccountBalance.displayName = "AccountBalance";
export const AccountBalance = React.memo(AccountBalanceComponent);
