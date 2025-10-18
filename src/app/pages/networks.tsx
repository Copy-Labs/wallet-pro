import { NetworksTab } from "~components/wallet/networks-tab"
import {PageBody, PageContainer, PageHeader, PageHeading} from "~components/PageContainer";
import React from "react";
import {Button, Callout, Flex} from "@radix-ui/themes";
import {useNavigate} from "react-router-dom";
import {LucideInfo} from "lucide-react";

export function NetworksPage() {
  const navigate = useNavigate();
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
        <PageHeading>Networks</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} p={'2'}>
          <Callout.Root color="gray" variant="soft" highContrast>
            <Callout.Icon>
              <LucideInfo size={16} />
            </Callout.Icon>
            <Callout.Text>
              {'Only add networks you trust. WalletPro cannot verify the security of every network.'}
            </Callout.Text>
          </Callout.Root>

          <NetworksTab />
        </Flex>
      </PageBody>

      <Flex direction={'row'} justify={'center'} gap={'4'} p={'4'} width="100%">
        <Button
          highContrast
          className={'flex-1'}
          size={'3'}
          onClick={handleAddChainListClick}
        >
          {'Add from Chainlist'}
        </Button>
        <Button className={''} size={'3'} onClick={handleAddClick}>
          {'Add Network'}
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
