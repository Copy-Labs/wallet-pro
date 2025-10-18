import {useChainList} from "~hooks/useChainList";
import React, {useMemo, useRef, useState} from "react";
import { useDebounce } from "@uidotdev/usehooks";
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import {Flex, Skeleton, Spinner, Switch, Text, TextField, Card, Badge, Avatar, Strong} from "@radix-ui/themes";
import {LucideSearchCode, CheckCircle, AlertCircle} from "lucide-react";
import Empty from "~components/Empty";
import { useNavigate } from "react-router-dom";
import { useCustomNetworks } from "~/store/ui-store";
import { getNetworkByChainId } from "~/utils/helper";
import { supportedChains } from "~/config/chains";
import type { ChainData } from "~/hooks/useChainList";
import {CustomChainItem} from "~components/CustomChainItem";
import {capitalize} from "~utils";
import {DotSpacer} from "~components/DotSpacer";
import {toHex} from "viem";
import {cn} from "~lib/utils";

const Loading = () => {
  return (
    <>
      <Card className="p-4">
        <Flex gap="3" align="center">
          <Skeleton width="40px" height="40px" className="rounded-full" />
          <div className="flex-1">
            <Skeleton width="120px" height="16px" className="mb-2" />
            <Skeleton width="80px" height="14px" />
          </div>
        </Flex>
      </Card>
      <Card className="p-4">
        <Flex gap="3" align="center">
          <Skeleton width="40px" height="40px" className="rounded-full" />
          <div className="flex-1">
            <Skeleton width="100px" height="16px" className="mb-2" />
            <Skeleton width="90px" height="14px" />
          </div>
        </Flex>
      </Card>
    </>
  );
};

interface ChainListItemProps {
  item: any;
  isAlreadyAdded: boolean;
  onSelect: (item: any) => void;
}

const ChainListItem = ({ item, isAlreadyAdded, onSelect }: ChainListItemProps) => {
  return (
    <Card
      className={cn("transition-colors", isAlreadyAdded ? '' : '')}
      variant={'surface'}
      onClick={() => onSelect(item)}
    >
      <Flex gap="3" align="center" maxWidth={'100%'} width={'100%'}>
        <Avatar
          className={'p-1'}
          size="3"
          src={`https://icons.llamao.fi/icons/chains/rsz_${item.icon || item.name || item.chain}.jpg`}
          // src={item.logo}
          radius="full"
          fallback={item.name?.trim().substring(0, 1).toUpperCase()}
        />
        {/*<div className="w-10 h-10 rounded-full flex items-center justify-center text-lg">
          {item.icon ? (
            <img src={item.icon} alt={item.name} className="w-6 h-6" />
          ) : (
            <span>{item.name?.charAt(0)?.toUpperCase()}</span>
          )}
        </div>*/}
        {/*<div className="flex-1 min-w-0">
          <Flex align="center" gap="2" className="mb-1">
            <Text size="3" weight="bold" className="truncate">
              {item.name}
            </Text>
            {isAlreadyAdded && (
              <Badge color="green" size="1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Added
              </Badge>
            )}
            {item.nativeCurrency?.symbol && (
              <Badge color="blue" size="1">
                {item.nativeCurrency.symbol}
              </Badge>
            )}
          </Flex>
          <Text size="2" color="gray">
            Chain ID: {item.chainId}
          </Text>
          {item.rpc?.length > 0 && (
            <Text size="1" color="gray" className="mt-1">
              {item.rpc.length} RPC endpoint{item.rpc.length !== 1 ? 's' : ''}
            </Text>
          )}
        </div>*/}
        <Flex justify={'between'} align={'center'} width={'100%'}>
          <Flex direction={'column'} gapY={'2'}>
            <Text
              as="div"
              size="3"
              weight="bold"
              className={'text-[--accent-12]'}
            >
              {item.name}
            </Text>
            <Flex direction={'row'} align={'center'} gapX={'2'}>
              {item?.chainSlug && (
                <>
                  <Text color="gray" size={'2'}>
                    <Strong>{capitalize(item?.chainSlug)}</Strong>
                  </Text>
                  <DotSpacer />
                </>
              )}
              <Text color="gray" size={'1'}>
                <Strong>{item.nativeCurrency?.symbol || item.currency?.symbol}</Strong>
              </Text>
              <DotSpacer />
              <Text color="gray" size={'1'}>
                {item?.id} ({toHex(item?.id || item?.chainId)})
              </Text>
            </Flex>
          </Flex>
        </Flex>
        {isAlreadyAdded && (
          <Badge color="grass" radius={'full'}>
            {isAlreadyAdded && 'Added'}
          </Badge>
        )}
      </Flex>
    </Card>
  );
};

export const ChainListExplorer = () => {
  const navigate = useNavigate();
  const {
    data,
    isLoading: chainListIsLoading,
    error: chainListError,
  } = useChainList();
  const [_search, setSearch] = useState('');
  const [showTestNetworks, setShowTestNetworks] = useState<boolean>(false);
  const search = useDebounce(_search, 300);

  // Get existing custom networks to check for duplicates
  const customNetworks = useCustomNetworks();

  const handleSelect = (item: ChainData) => {
    navigate(`/networks/chainlist/${item.chainId}`);
  };

  // Process and filter chain list data
  const processedChains = useMemo(() => {
    if (!data) return [];

    return data
      .filter((item) => {
        // Filter out items without required data
        if (!item.name || !item.chainId) return false;

        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch =
            item.name.toLowerCase().includes(searchLower) ||
            item.nativeCurrency?.symbol?.toLowerCase().includes(searchLower) ||
            item.chainId.toString().includes(search);

          if (!matchesSearch) return false;
        }

        // Testnet filter
        if (showTestNetworks) {
          const isTestNetwork = item.name.toLowerCase().includes('testnet')
            || item.name.toLowerCase().includes('test')
            || item.name.toLowerCase().includes('sepolia')
            // || item.chainId > 1000; // Simple heuristic for testnets
          return isTestNetwork;
        }

        return true;
      })
      .map((item) => {
        // Check if it's a predefined network
        const isPredefinedNetwork = supportedChains.some(chain => chain.id === item.chainId)

        // Check if it's a custom network
        const isCustomNetwork = customNetworks.some(cn => cn.chainId === item.chainId)

        return {
          ...item,
          // Network is already available if it's either predefined or custom
          isAlreadyAdded: isPredefinedNetwork || isCustomNetwork,
          networkType: isPredefinedNetwork ? 'predefined' : isCustomNetwork ? 'custom' : 'new'
        }
      })
      .sort((a, b) => {
        // Sort: already added first, then by name
        if (a.isAlreadyAdded && !b.isAlreadyAdded) return -1;
        if (!a.isAlreadyAdded && b.isAlreadyAdded) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [data, search, showTestNetworks, customNetworks]);

  const isEmpty = !chainListIsLoading && processedChains.length === 0;

  if (chainListError) {
    return (
      <PageContainer>
        <PageHeader showBackButton>
          <PageHeading>Browse Networks</PageHeading>
        </PageHeader>
        <PageBody>
          <Card className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <Text size="3" weight="bold" className="mb-2">
              Failed to Load Chain List
            </Text>
            <Text color="gray">
              Unable to fetch network data from ChainList.org. Please check your internet connection and try again.
            </Text>
          </Card>
        </PageBody>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>Browse Networks</PageHeading>
      </PageHeader>

      {/* Search and Filters */}
      <div className="p-2">
        <Flex direction="column" gap="3">
          <TextField.Root
            placeholder="Search by name, symbol, or chain ID..."
            size="2"
            value={_search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <LucideSearchCode size="16" />
            </TextField.Slot>
          </TextField.Root>

          <Flex align="center" justify="between">
            <Text size="2" weight="medium">
              Show only Testnets
            </Text>
            <Switch
              checked={showTestNetworks}
              color={'blue'}
              onCheckedChange={setShowTestNetworks}
            />
          </Flex>
        </Flex>
      </div>

      <PageBody>
        {chainListIsLoading ? (
          <Flex direction="column" gap="3" p="4">
            <Loading />
          </Flex>
        ) : isEmpty ? (
          <div className="p-4">
            <Card className="p-8 text-center">
              <Text size="3" color="gray">
                {search ? `No networks found for "${search}"` : 'No networks available'}
              </Text>
            </Card>
          </div>
        ) : (
          <Flex direction="column" gap="3" p="4">
            {processedChains.map((item) => (
              <ChainListItem
                key={item.chainId}
                item={item}
                isAlreadyAdded={item.isAlreadyAdded}
                onSelect={handleSelect}
              />
            ))}
          </Flex>
        )}
      </PageBody>
    </PageContainer>
  );
};
