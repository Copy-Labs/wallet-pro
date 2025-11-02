import Empty from "~components/Empty";
import {Flex, Text} from "@radix-ui/themes";
import {Button} from "@radix-ui/themes/dist/esm";
import {Link} from "react-router-dom";
import React from "react";
import {PageBody, PageContainer, PageFooter} from "~components/PageContainer";
import {CardContainer} from "~components/CardContainer";

export default function EmptyPage() {
  return (
    <CardContainer variant={'ghost'}>
      <PageBody>
        <Empty
          children={
            <Flex align={'center'} direction={'column'} gap={'4'} my={'4'}>
              <Flex direction={'column'} align={'center'} gap={'2'}>
                <Text size={'3'} weight={'medium'}>Seems you got lost exploring WalletPro</Text>
                <Text size={'2'} color={'gray'}>Let's direct you back to where the fun happens.</Text>
              </Flex>

              <Link to={'/'}>
                <Button highContrast size={'2'} variant={'solid'}>
                  Back to Home Page
                </Button>
              </Link>
            </Flex>
          }
          title={'Oops'}
        />
      </PageBody>
      <PageFooter>
        <Flex align={'center'} direction={'column'} justify={'start'} gap={'2'} p={'2'}>
          <Text color={'gray'} size={'1'}>Or if you have a complaint about this</Text>
          <Link to={'/feedback'}>
            <Button
              className={'underline underline-offset-2'}
              radius={'large'}
              size={'1'}
              variant={'ghost'}
            >
              Send us a Feedback
            </Button>
          </Link>
        </Flex>
      </PageFooter>
    </CardContainer>
  )
}
