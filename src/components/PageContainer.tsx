import {
  Box,
  Container,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Section,
  Spinner, Theme,
} from '@radix-ui/themes';
import { LucideArrowLeft } from 'lucide-react';
import {type ReactNode, Suspense} from "react";
import {HashRouter, useNavigate} from 'react-router-dom';
import {Toaster} from "sonner";
import {WalletRouter} from "~app/router";
import {ThemeProvider} from "~components/theme-provider";
import {getEnhancedUiType, getUITypeName} from "~utils";
import {cn} from "~lib/utils";

const enhancedUiType = getEnhancedUiType();

export const PageTabThemesContainer = ({children} : {children: ReactNode}) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      <Theme
        accentColor="gray"
        appearance={'inherit'}
        grayColor="sand"
        className={cn("min-h-[600px] w-full mx-auto", enhancedUiType.isPopup ? 'min-w-[375px]' : 'max-w-[100%]')}
        radius="large"
      >
        <Toaster
          visibleToasts={2}
          richColors={true}
          duration={4000}
          closeButton={true}
        />
        {children}
      </Theme>
    </ThemeProvider>
  )
}

export const PageContainer = ({
  fallback,
  children,
}: {
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Suspense fallback={fallback || <Spinner size={'3'} />}>
      <Container>
        <Flex direction={'column'} width={'100%'} height={'100dvh'}>
          {children}
        </Flex>
      </Container>
    </Suspense>
  );
};

export const PageHeading = ({
  center = false,
  children,
}: {
  center?: boolean;
  children: ReactNode;
}) => {
  return (
    <Heading
      align={center ? 'center' : 'left'}
      size={'5'}
      style={{ width: center ? '100%' : 'auto' }}
    >
      {children}
    </Heading>
  );
};

export const PageHeader = ({
  showBackButton = true,
  children,
}: {
  showBackButton?: boolean;
  children: ReactNode;
}) => {
  const tryNavigate = () => {
    try {
      const navigate = useNavigate();
      navigate(-1);
    } catch {
      // Not in router context, fallback to browser back
      window.history.back();
    }
  };

  return (
    <Flex
      direction={'column'}
      justify={'center'}
      px={'3'}
      className={'min-h-16 leading-[48px]'}
    >
      {showBackButton ? (
        <Flex align={'center'} gapX={'4'}>
          <IconButton
            variant={'ghost'}
            radius={'large'}
            style={{ width: '40px' }}
            onClick={tryNavigate} // Safe navigation with fallback
          >
            <LucideArrowLeft size={24} strokeWidth={4} />
          </IconButton>
          {children}
        </Flex>
      ) : (
        <>{children}</>
      )}
    </Flex>
  );
};

export const PageBody = ({ children }: { children: ReactNode }) => {
  return (
    <ScrollArea
      type="hover"
      scrollbars="vertical"
      style={{ width: '100%', height: '100%', maxWidth: enhancedUiType.isPopup ? '375px' : '100%' }}
    >
      <Box px={'0'} width={'100%'} maxWidth={enhancedUiType.isPopup ? '375px' : '100%'}>
        {children}
      </Box>
    </ScrollArea>
  );
};

export const PageFooter = ({ children }: { children: ReactNode }) => {
  return (
    <Box
      className="rounded-[6px] overflow-hidden"
      style={{ width: '100%', padding: '0px' }}
    >
      {children}
    </Box>
  );
};
