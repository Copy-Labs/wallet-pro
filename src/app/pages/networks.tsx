import { NetworksTab } from "~components/wallet/networks-tab"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import React from "react";
import {Button, Callout, Flex, SegmentedControl, Text} from "@radix-ui/themes";
import {useNavigate} from "react-router-dom";
import {LucideInfo, Settings} from "lucide-react";
import { isMainnetAllowed } from "~/utils/environment";

export function NetworksPage() {
  const navigate = useNavigate();
  const mainnetAllowed = isMainnetAllowed();
  const [networkFilter, setNetworkFilter] = React.useState<'all' | 'testnet' | 'mainnet'>(mainnetAllowed ? 'all' : 'testnet');

  const handleAddClick = () => {
    // matomoRequestEvent({
    //   category: 'New Network',
    //   action: 'Click Add Network',
    // });

    navigate('/networks/add');
  };

  const handleAddChainListClick = () => {
    // matomoRequestEvent({
    //   category: 'New Network',
    //   action: 'Click Add Network From ChainList',
    // });

    navigate('/networks/chainlist');
  };

  return (
    <PageContainer>
      {/*<WalletHeader title="Networks" />*/}
      <PageHeader>
        <Flex align={'center'} justify={'between'} className={'w-full'}>
          <PageHeading>Networks</PageHeading>
          <Button
            // className="text-blue-400 hover:text-blue-300"
            color={'grass'}
            variant={'soft'}
            onClick={() => navigate('/networks/custom')}
          >
            <Settings size={12} />
            Manage
          </Button>
        </Flex>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} px={'2'}>
          <Flex className={'z-40 bg-[--accent-1]'} position={'sticky'} top={'0'} width={'100%'} p={'1'} mb={'1'}>
            {mainnetAllowed && (
              <SegmentedControl.Root
                value={networkFilter}
                onValueChange={(value) => setNetworkFilter(value as 'all' | 'testnet' | 'mainnet')}
                className={'w-full'}
              >
                <SegmentedControl.Item value="all">All</SegmentedControl.Item>
                <SegmentedControl.Item value="testnet">Testnet</SegmentedControl.Item>
                <SegmentedControl.Item value="mainnet">Mainnet</SegmentedControl.Item>
              </SegmentedControl.Root>
            )}
          </Flex>

          {networkFilter === "all" && <Callout.Root color="gray" variant="soft" highContrast>
            <Callout.Icon>
              <LucideInfo size={16}/>
            </Callout.Icon>
            <Callout.Text>
              {'Only add networks you trust. WalletPro cannot verify the security of every network.'}
            </Callout.Text>
          </Callout.Root>}

          <NetworksTab networkFilter={networkFilter} />
        </Flex>
      </PageBody>

      <Flex direction={'row'} justify={'center'} gap={'2'} p={'2'} width="100%">
        <Button
          highContrast
          className={'flex-1'}
          size={'2'}
          onClick={handleAddChainListClick}
        >
          {'Add from Chainlist'}
        </Button>
        <Button className={''} size={'2'} variant={'soft'} onClick={handleAddClick}>
          {'Add Manually'}
        </Button>
      </Flex>

      {/* Info Footer */}
      <div hidden className="p-4">
        <p className="text-xs text-muted-foreground">
          💡 Switching networks instantly updates all account balances.
          Make sure you have the native token (ETH, MATIC, etc.) for gas fees on the selected network.
        </p>
      </div>
      {/*<BottomNavigation />*/}
    </PageContainer>
  )
}
