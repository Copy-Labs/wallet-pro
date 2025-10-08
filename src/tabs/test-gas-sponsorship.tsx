/**
 * Gas Sponsorship Test Page
 * Test and verify Alchemy Gas Manager integration
 */

import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  Theme,
  Callout,
  Badge,
  Code,
  Separator
} from "@radix-ui/themes"
import { 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Send
} from "lucide-react"
import {
  runAllGasSponsorshipTests,
  getGasSponsorshipStatus,
  testGasEstimation,
  type GasSponsorshipTestResult
} from "~/utils/test-gas-sponsorship"
import { getActiveAccount } from "~/services/wallet"
import { sendEth } from "~/services/transaction"
import { fetchEthBalance } from "~/services/balance"
import { getSelectedNetwork } from "~/utils/storage"
import { getChainById, defaultChain } from "~/config/chains"
import type { Address } from "viem"

import "~/styles/globals.css"

function TestGasSponsorship() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [gasSponsorshipStatus, setGasSponsorshipStatus] = useState(getGasSponsorshipStatus())
  const [accountAddress, setAccountAddress] = useState<string>("")
  const [accountBalance, setAccountBalance] = useState<string>("")
  
  // Test transaction fields
  const [recipientAddress, setRecipientAddress] = useState<string>("")
  const [sendAmount, setSendAmount] = useState<string>("0.001")
  const [gasEstimate, setGasEstimate] = useState<GasSponsorshipTestResult | null>(null)
  const [txHash, setTxHash] = useState<string>("")
  const [txError, setTxError] = useState<string>("")

  useEffect(() => {
    loadAccountInfo()
  }, [])

  const loadAccountInfo = async () => {
    try {
      const account = await getActiveAccount()
      if (account) {
        setAccountAddress(account.address)
        
        const chainId = await getSelectedNetwork()
        const chain = chainId ? getChainById(chainId) || defaultChain : defaultChain
        const balance = await fetchEthBalance(account.address as Address, chain)
        setAccountBalance(balance)
      }
    } catch (error) {
      console.error("Error loading account info:", error)
    }
  }

  const handleRunTests = async () => {
    setLoading(true)
    setTestResults(null)
    
    try {
      const results = await runAllGasSponsorshipTests()
      setTestResults(results)
      setGasSponsorshipStatus(getGasSponsorshipStatus())
    } catch (error) {
      console.error("Error running tests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEstimateGas = async () => {
    if (!recipientAddress) {
      setTxError("Please enter a recipient address")
      return
    }

    setLoading(true)
    setGasEstimate(null)
    setTxError("")

    try {
      const estimate = await testGasEstimation(recipientAddress as Address, sendAmount)
      setGasEstimate(estimate)
    } catch (error) {
      setTxError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendTransaction = async () => {
    if (!recipientAddress || !sendAmount) {
      setTxError("Please enter recipient address and amount")
      return
    }

    setLoading(true)
    setTxHash("")
    setTxError("")

    try {
      const account = await getActiveAccount()
      if (!account) {
        throw new Error("No active account")
      }

      const hash = await sendEth(account.id, recipientAddress as Address, sendAmount, true)
      setTxHash(hash)
      
      // Reload balance after transaction
      await loadAccountInfo()
    } catch (error) {
      setTxError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle2 size={20} color="var(--green-9)" /> : <XCircle size={20} color="var(--red-9)" />
  }

  return (
    <Theme>
      <Box
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, var(--purple-9) 0%, var(--blue-9) 100%)',
          padding: 'var(--space-6)'
        }}
      >
        <Box style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Flex direction="column" gap="6">
            {/* Header */}
            <Card>
              <Flex direction="column" gap="4" p="4">
                <Flex align="center" gap="3">
                  <Zap size={32} color="var(--purple-9)" />
                  <Box>
                    <Heading size="6">Gas Sponsorship Test</Heading>
                    <Text size="2" color="gray">
                      Verify Alchemy Gas Manager integration
                    </Text>
                  </Box>
                </Flex>

                {/* Status Badge */}
                <Flex align="center" gap="2">
                  <Text size="2" weight="bold">Status:</Text>
                  <Badge 
                    color={gasSponsorshipStatus.enabled ? "green" : "amber"}
                    size="2"
                  >
                    {gasSponsorshipStatus.icon} {gasSponsorshipStatus.message}
                  </Badge>
                </Flex>

                {/* Account Info */}
                {accountAddress && (
                  <Box>
                    <Text size="2" color="gray">Active Account:</Text>
                    <Code size="2">{accountAddress}</Code>
                    <Text size="2" color="gray" mt="1">
                      Balance: {accountBalance} ETH
                    </Text>
                  </Box>
                )}
              </Flex>
            </Card>

            {/* Run Tests Button */}
            <Card>
              <Flex direction="column" gap="4" p="4">
                <Heading size="4">Configuration Tests</Heading>
                <Text size="2" color="gray">
                  Run tests to verify gas sponsorship is configured correctly
                </Text>
                
                <Button
                  size="3"
                  onClick={handleRunTests}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                >
                  <RefreshCw size={16} />
                  {loading ? "Running Tests..." : "Run All Tests"}
                </Button>

                {/* Test Results */}
                {testResults && (
                  <Box>
                    <Separator size="4" my="3" />
                    
                    {/* Config Test */}
                    <Callout.Root 
                      color={testResults.configTest.success ? "green" : "red"}
                      size="1"
                      mb="3"
                    >
                      <Callout.Icon>
                        {getStatusIcon(testResults.configTest.success)}
                      </Callout.Icon>
                      <Callout.Text>
                        <Text size="2" weight="bold">Configuration Test</Text>
                        <Text size="2">{testResults.configTest.message}</Text>
                      </Callout.Text>
                    </Callout.Root>

                    {/* Client Test */}
                    <Callout.Root 
                      color={testResults.clientTest.success ? "green" : "red"}
                      size="1"
                    >
                      <Callout.Icon>
                        {getStatusIcon(testResults.clientTest.success)}
                      </Callout.Icon>
                      <Callout.Text>
                        <Text size="2" weight="bold">Client Creation Test</Text>
                        <Text size="2">{testResults.clientTest.message}</Text>
                      </Callout.Text>
                    </Callout.Root>

                    {/* Summary */}
                    <Box mt="3">
                      <Text size="3" weight="bold">
                        {testResults.summary}
                      </Text>
                    </Box>
                  </Box>
                )}
              </Flex>
            </Card>

            {/* Test Transaction */}
            <Card>
              <Flex direction="column" gap="4" p="4">
                <Heading size="4">Test Transaction</Heading>
                <Text size="2" color="gray">
                  Send a small test transaction to verify gas sponsorship works
                </Text>

                <Callout.Root color="amber" size="1">
                  <Callout.Icon>
                    <AlertTriangle />
                  </Callout.Icon>
                  <Callout.Text>
                    This will send real ETH on {defaultChain.name}. Use a small amount for testing.
                  </Callout.Text>
                </Callout.Root>

                <Box>
                  <Text as="label" size="2" weight="bold" mb="2">
                    Recipient Address
                  </Text>
                  <TextField.Root
                    size="3"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                  />
                </Box>

                <Box>
                  <Text as="label" size="2" weight="bold" mb="2">
                    Amount (ETH)
                  </Text>
                  <TextField.Root
                    size="3"
                    type="number"
                    step="0.001"
                    placeholder="0.001"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                  />
                </Box>

                <Flex gap="3">
                  <Button
                    variant="soft"
                    onClick={handleEstimateGas}
                    disabled={loading || !recipientAddress}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    Estimate Gas
                  </Button>
                  <Button
                    onClick={handleSendTransaction}
                    disabled={loading || !recipientAddress || !sendAmount}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <Send size={16} />
                    Send Transaction
                  </Button>
                </Flex>

                {/* Gas Estimate Result */}
                {gasEstimate && (
                  <Callout.Root 
                    color={gasEstimate.success ? "green" : "red"}
                    size="1"
                  >
                    <Callout.Text>{gasEstimate.message}</Callout.Text>
                  </Callout.Root>
                )}

                {/* Transaction Hash */}
                {txHash && (
                  <Callout.Root color="green" size="1">
                    <Callout.Icon>
                      <CheckCircle2 />
                    </Callout.Icon>
                    <Callout.Text>
                      <Text size="2" weight="bold">Transaction Sent!</Text>
                      <Code size="1">{txHash}</Code>
                    </Callout.Text>
                  </Callout.Root>
                )}

                {/* Transaction Error */}
                {txError && (
                  <Callout.Root color="red" size="1">
                    <Callout.Icon>
                      <XCircle />
                    </Callout.Icon>
                    <Callout.Text>{txError}</Callout.Text>
                  </Callout.Root>
                )}
              </Flex>
            </Card>
          </Flex>
        </Box>
      </Box>
    </Theme>
  )
}

export default TestGasSponsorship

