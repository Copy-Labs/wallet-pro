import React, { Component, ReactNode } from 'react'
import { Button, Flex, Heading, Text } from '@radix-ui/themes'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Flex direction="column" align="center" justify="center" p="4" className="min-h-[600px]">
          <Heading size="4" color="red">Something went wrong</Heading>
          <Text size="2" color="gray" mt="2">
            Failed to initialize the wallet. Please try refreshing the page.
          </Text>
          {this.state.error && (
            <Text size="1" color="gray" mt="2" style={{ wordBreak: 'break-word' }}>
              {this.state.error.message}
            </Text>
          )}
          <Button
            mt="4"
            onClick={() => window.location.reload()}
            variant="soft"
          >
            Refresh Page
          </Button>
        </Flex>
      )
    }

    return this.props.children
  }
}
