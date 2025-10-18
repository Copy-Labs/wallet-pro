import React, { type ReactNode } from 'react';
import { Flex, Heading, Text } from '@radix-ui/themes';
import { LucideBookOpen, LucideFolderOpen } from 'lucide-react';

interface EmptyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  title?: ReactNode;
  desc?: ReactNode;
}

const Empty = ({ className, style, children, title, desc }: EmptyProps) => {
  return (
    <Flex
      direction={'column'}
      align={'center'}
      justify={'center'}
      gap={'4'}
      py={'8'}
    >
      <LucideBookOpen size={32} />
      <Flex
        direction={'column'}
        align={'center'}
        justify={'center'}
        gap={'2'}
      >
        <Heading align={'center'} size={'6'} wrap={'balance'}>
          {title}
        </Heading>
        <Text align={'center'} size={'3'} wrap={'pretty'}>
          {children ? children : desc}
        </Text>
      </Flex>
    </Flex>
  );
};

export default Empty;
