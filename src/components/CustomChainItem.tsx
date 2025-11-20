import { Avatar, Badge, Card, Flex, Strong, Text } from '@radix-ui/themes';
import React from 'react';
import {useChainList} from "~hooks/useChainList";
import {type Chain, toHex} from "viem";
import {DotSpacer} from "~components/DotSpacer";
import {capitalize} from "~utils";
import {useNavigate} from "react-router-dom";
import type {CustomNetwork} from "~types/network";
import {ChainIcon} from "~components/icons/ChainIcon";

export type TestnetChainWithRpcList = CustomNetwork & { rpcList?: string[] };

export const CustomChainItem = (
  {
    className,
    item,
    chainData,
  }: {
    className?: string;
    item: Chain & CustomNetwork;
    chainData?: Chain & CustomNetwork;
  }) => {
  const navigate = useNavigate();
  // const { t } = useTranslation();
  // const history = useHistory();
  const {
    data: chainListData,
    isLoading: chainListIsLoading,
    error: chainListError,
  } = useChainList();

  console.log("Custom Chain Item:: Item", item);

  const chainItem = chainListData?.find((it) => it.chainId === item.id);

  return (
    <>
      <Card
        variant={'surface'}
        size={'1'}
        className={'hover:bg-[--accent-3] cursor-pointer'}
        onClick={() => {
          navigate({
            pathname: `/networks/chainlist/${item?.chainId || item?.id}`,
          });
        }}
      >
        {/*<Link*/}
        {/*  // to={`/networks/explore/${chainId}`}*/}
        {/*  to={`/custom-testnet/chainlist-details/${item?.id}`}*/}
        {/*  color={'inherit'}*/}
        {/*  style={{ textDecoration: 'none' }}*/}
        {/*>*/}
        <Flex gap="3" align="center" width={'100%'}>
          {/*<Avatar
            className={'p-1'}
            size="3"
            src={`https://icons.llamao.fi/icons/chains/rsz_${item.name}.jpg`}
            // src={item.logo}
            radius="full"
            fallback={item.name?.trim().substring(0, 1).toUpperCase()}
          />*/}
          <ChainIcon chainId={item.chainId || item.id} className={'flex items-center justify-center text-xl! w-8 h-8 rounded-full bg-gray3'} />
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
                {chainItem?.chainSlug && (
                  <>
                    <Text color="gray" size={'2'}>
                      <Strong>{capitalize(chainItem?.chainSlug)}</Strong>
                    </Text>
                    <DotSpacer />
                  </>
                )}
                <Text color="gray" size={'1'}>
                  <Strong>{item.nativeCurrency?.symbol || item.currency?.symbol}</Strong>
                </Text>
                <DotSpacer />
                <Text color="gray" size={'1'}>
                  {item?.chainId || item?.id} ({toHex(item?.chainId || item?.id)})
                </Text>
              </Flex>
            </Flex>
          </Flex>
          {chainData && (
            <Badge color="grass" radius={'full'}>
              {chainData && 'Added'}
            </Badge>
          )}
        </Flex>
        {/*</Link>*/}
      </Card>
    </>
  );
};
