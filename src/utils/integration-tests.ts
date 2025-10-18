/**
 * Integration Tests for Custom Networks Feature
 * Tests the complete workflow from adding to using custom networks
 */

import {
  saveCustomNetwork,
  getCustomNetworks,
  updateCustomNetwork,
  deleteCustomNetwork,
  getCustomNetworkById,
  getCustomNetworkByChainId,
  updateCustomNetworkStatus,
  updateCustomNetworkLastUsed,
  getFavoriteNetworks,
  addFavoriteNetwork,
  removeFavoriteNetwork,
  isFavoriteNetwork,
  getNetworkAnalytics,
  recordNetworkConnection,
  recordNetworkDisconnection,
  exportCustomNetworks,
  importCustomNetworks
} from './storage'
import { validateNetworkConfiguration, validateRpcEndpoint, validateChainIdUniqueness } from './network-validation'
import { networkHealthMonitor } from './network-health-monitor'
import type { CustomNetwork, CustomNetworkFormData } from '~/types/network'

// Test data
const TEST_NETWORK_1: CustomNetwork = {
  id: 'test_network_1',
  name: 'Test Polygon Network',
  chainId: 137,
  rpcUrl: 'https://polygon-rpc.com',
  currency: {
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18
  },
  blockExplorerUrl: 'https://polygonscan.com',
  isActive: true,
  dateAdded: Date.now(),
  status: 'offline'
}

const TEST_NETWORK_2: CustomNetwork = {
  id: 'test_network_2',
  name: 'Test BSC Network',
  chainId: 56,
  rpcUrl: 'https://bsc-dataseed.binance.org',
  currency: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    decimals: 18
  },
  blockExplorerUrl: 'https://bscscan.com',
  isActive: true,
  dateAdded: Date.now(),
  status: 'offline'
}

const TEST_FORM_DATA: CustomNetworkFormData = {
  name: 'Test Network',
  chainId: '999',
  rpcUrl: 'https://test-rpc.example.com',
  currencyName: 'Test Coin',
  currencySymbol: 'TEST',
  currencyDecimals: '18',
  blockExplorerUrl: 'https://test-explorer.example.com'
}

export class CustomNetworksIntegrationTester {
  private testResults: Array<{ test: string; passed: boolean; error?: string }> = []

  private log(test: string, passed: boolean, error?: string) {
    this.testResults.push({ test, passed, error })
    console.log(`[${passed ? '✅' : '❌'}] ${test}${error ? `: ${error}` : ''}`)
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Custom Networks Integration Tests...\n')

    try {
      // Test 1: Network CRUD Operations
      await this.testNetworkCRUDOperations()

      // Test 2: Network Validation
      await this.testNetworkValidation()

      // Test 3: Favorites Management
      await this.testFavoritesManagement()

      // Test 4: Analytics Tracking
      await this.testAnalyticsTracking()

      // Test 5: Bulk Import/Export
      await this.testBulkImportExport()

      // Test 6: Health Monitoring
      await this.testHealthMonitoring()

      // Test 7: End-to-End Workflow
      await this.testEndToEndWorkflow()

      this.printSummary()
    } catch (error) {
      console.error('❌ Integration tests failed:', error)
    }
  }

  private async testNetworkCRUDOperations(): Promise<void> {
    console.log('📋 Testing Network CRUD Operations...')

    try {
      // Test: Save network
      await saveCustomNetwork(TEST_NETWORK_1)
      this.log('Save custom network', true)

      // Test: Get all networks
      const networks = await getCustomNetworks()
      if (networks.length === 0) throw new Error('No networks found after save')
      this.log('Get all custom networks', true)

      // Test: Get network by ID
      const networkById = await getCustomNetworkById(TEST_NETWORK_1.id)
      if (!networkById) throw new Error('Network not found by ID')
      this.log('Get network by ID', true)

      // Test: Get network by chain ID
      const networkByChainId = await getCustomNetworkByChainId(TEST_NETWORK_1.chainId)
      if (!networkByChainId) throw new Error('Network not found by chain ID')
      this.log('Get network by chain ID', true)

      // Test: Update network
      const updatedNetwork = { ...TEST_NETWORK_1, name: 'Updated Test Network' }
      await updateCustomNetwork(updatedNetwork)
      const updated = await getCustomNetworkById(TEST_NETWORK_1.id)
      if (updated?.name !== 'Updated Test Network') throw new Error('Network not updated correctly')
      this.log('Update custom network', true)

      // Test: Update network status
      await updateCustomNetworkStatus(TEST_NETWORK_1.id, 'online')
      const statusUpdated = await getCustomNetworkById(TEST_NETWORK_1.id)
      if (statusUpdated?.status !== 'online') throw new Error('Network status not updated')
      this.log('Update network status', true)

      // Test: Update last used
      await updateCustomNetworkLastUsed(TEST_NETWORK_1.id)
      const lastUsedUpdated = await getCustomNetworkById(TEST_NETWORK_1.id)
      if (!lastUsedUpdated?.lastUsed) throw new Error('Last used not updated')
      this.log('Update network last used', true)

      // Test: Delete network
      await deleteCustomNetwork(TEST_NETWORK_1.id)
      const deleted = await getCustomNetworkById(TEST_NETWORK_1.id)
      if (deleted) throw new Error('Network not deleted')
      this.log('Delete custom network', true)

    } catch (error) {
      this.log('Network CRUD Operations', false, error.message)
    }

    console.log('')
  }

  private async testNetworkValidation(): Promise<void> {
    console.log('🔍 Testing Network Validation...')

    try {
      // Test: Valid form data
      const validResult = validateNetworkConfiguration(TEST_FORM_DATA)
      if (!validResult.isValid) throw new Error('Valid form data failed validation')
      this.log('Validate valid form data', true)

      // Test: Invalid form data
      const invalidFormData = { ...TEST_FORM_DATA, name: '' }
      const invalidResult = validateNetworkConfiguration(invalidFormData)
      if (invalidResult.isValid) throw new Error('Invalid form data passed validation')
      this.log('Validate invalid form data', true)

      // Test: Chain ID uniqueness (should pass for new chain ID)
      const uniquenessResult = await validateChainIdUniqueness(999)
      if (!uniquenessResult.isValid) throw new Error('Chain ID uniqueness validation failed')
      this.log('Validate chain ID uniqueness', true)

      // Test: RPC endpoint validation (mock test)
      try {
        // This will likely fail due to network, but should not throw
        await validateRpcEndpoint('https://invalid-rpc-url.test')
        this.log('RPC endpoint validation (expected to fail gracefully)', true)
      } catch (error) {
        this.log('RPC endpoint validation (error handling)', false, error.message)
      }

    } catch (error) {
      this.log('Network Validation', false, error.message)
    }

    console.log('')
  }

  private async testFavoritesManagement(): Promise<void> {
    console.log('⭐ Testing Favorites Management...')

    try {
      // Test: Add to favorites
      await addFavoriteNetwork(TEST_NETWORK_2.id)
      const isFavorite = await isFavoriteNetwork(TEST_NETWORK_2.id)
      if (!isFavorite) throw new Error('Network not added to favorites')
      this.log('Add network to favorites', true)

      // Test: Get favorite networks
      const favorites = await getFavoriteNetworks()
      if (!favorites.includes(TEST_NETWORK_2.id)) throw new Error('Network not in favorites list')
      this.log('Get favorite networks', true)

      // Test: Remove from favorites
      await removeFavoriteNetwork(TEST_NETWORK_2.id)
      const notFavorite = await isFavoriteNetwork(TEST_NETWORK_2.id)
      if (notFavorite) throw new Error('Network not removed from favorites')
      this.log('Remove network from favorites', true)

    } catch (error) {
      this.log('Favorites Management', false, error.message)
    }

    console.log('')
  }

  private async testAnalyticsTracking(): Promise<void> {
    console.log('📊 Testing Analytics Tracking...')

    try {
      // Test: Record network connection
      await recordNetworkConnection(TEST_NETWORK_2.id, TEST_NETWORK_2.name, TEST_NETWORK_2.chainId, true)
      this.log('Record network connection', true)

      // Test: Record network disconnection with session duration
      await recordNetworkDisconnection(TEST_NETWORK_2.id, TEST_NETWORK_2.name, TEST_NETWORK_2.chainId, true, 300000) // 5 minutes
      this.log('Record network disconnection', true)

      // Test: Get analytics
      const analytics = await getNetworkAnalytics()
      if (!analytics.customNetworks[TEST_NETWORK_2.id]) throw new Error('Analytics not recorded')
      this.log('Get network analytics', true)

    } catch (error) {
      this.log('Analytics Tracking', false, error.message)
    }

    console.log('')
  }

  private async testBulkImportExport(): Promise<void> {
    console.log('📦 Testing Bulk Import/Export...')

    try {
      // First, save a test network
      await saveCustomNetwork(TEST_NETWORK_2)

      // Test: Export networks
      const exportData = await exportCustomNetworks()
      if (!exportData) throw new Error('Export returned empty data')
      this.log('Export custom networks', true)

      // Test: Import networks (merge strategy)
      const importResult = await importCustomNetworks(exportData, 'merge')
      if (!importResult.success) throw new Error('Import failed')
      this.log('Import custom networks (merge)', true)

      // Test: Import networks (replace strategy)
      const importReplaceResult = await importCustomNetworks(exportData, 'replace')
      if (!importReplaceResult.success) throw new Error('Import replace failed')
      this.log('Import custom networks (replace)', true)

      // Clean up
      await deleteCustomNetwork(TEST_NETWORK_2.id)

    } catch (error) {
      this.log('Bulk Import/Export', false, error.message)
    }

    console.log('')
  }

  private async testHealthMonitoring(): Promise<void> {
    console.log('💚 Testing Health Monitoring...')

    try {
      // Test: Start monitoring
      await networkHealthMonitor.startMonitoring()
      this.log('Start health monitoring', true)

      // Test: Add network to monitoring
      await saveCustomNetwork(TEST_NETWORK_2)
      await networkHealthMonitor.addNetworkToMonitoring(TEST_NETWORK_2.id)
      this.log('Add network to monitoring', true)

      // Test: Manual health check
      const isHealthy = await networkHealthMonitor.checkNetworkHealthManually(TEST_NETWORK_2.id)
      // This might fail due to network, but should not throw
      this.log('Manual health check', true)

      // Test: Stop monitoring
      await networkHealthMonitor.removeNetworkFromMonitoring(TEST_NETWORK_2.id)
      networkHealthMonitor.stopMonitoring()
      this.log('Stop health monitoring', true)

      // Clean up
      await deleteCustomNetwork(TEST_NETWORK_2.id)

    } catch (error) {
      this.log('Health Monitoring', false, error.message)
    }

    console.log('')
  }

  private async testEndToEndWorkflow(): Promise<void> {
    console.log('🔄 Testing End-to-End Workflow...')

    try {
      // Step 1: Add a new network
      const formData: CustomNetworkFormData = {
        name: 'E2E Test Network',
        chainId: '1001',
        rpcUrl: 'https://e2e-test-rpc.example.com',
        currencyName: 'E2E Coin',
        currencySymbol: 'E2E',
        currencyDecimals: '18',
        blockExplorerUrl: 'https://e2e-explorer.example.com'
      }

      const validation = validateNetworkConfiguration(formData)
      if (!validation.isValid) throw new Error('Form validation failed')

      const newNetwork: CustomNetwork = {
        id: `e2e_${Date.now()}`,
        name: formData.name,
        chainId: parseInt(formData.chainId),
        rpcUrl: formData.rpcUrl,
        currency: {
          name: formData.currencyName,
          symbol: formData.currencySymbol,
          decimals: parseInt(formData.currencyDecimals)
        },
        blockExplorerUrl: formData.blockExplorerUrl,
        isActive: true,
        dateAdded: Date.now(),
        status: 'offline'
      }

      await saveCustomNetwork(newNetwork)
      this.log('Step 1: Add new network', true)

      // Step 2: Add to favorites
      await addFavoriteNetwork(newNetwork.id)
      const isFav = await isFavoriteNetwork(newNetwork.id)
      if (!isFav) throw new Error('Network not in favorites')
      this.log('Step 2: Add to favorites', true)

      // Step 3: Record usage analytics
      await recordNetworkConnection(newNetwork.id, newNetwork.name, newNetwork.chainId, true)
      await recordNetworkDisconnection(newNetwork.id, newNetwork.name, newNetwork.chainId, true, 60000)
      this.log('Step 3: Record usage analytics', true)

      // Step 4: Test health monitoring
      await networkHealthMonitor.startMonitoring()
      await networkHealthMonitor.addNetworkToMonitoring(newNetwork.id)
      this.log('Step 4: Start health monitoring', true)

      // Step 5: Export and import
      const exportData = await exportCustomNetworks()
      if (!exportData) throw new Error('Export failed')

      await deleteCustomNetwork(newNetwork.id) // Remove original

      const importResult = await importCustomNetworks(exportData, 'replace')
      if (!importResult.success || importResult.imported === 0) throw new Error('Import failed')
      this.log('Step 5: Export and import', true)

      // Step 6: Clean up
      const importedNetworks = await getCustomNetworks()
      const importedNetwork = importedNetworks.find(n => n.name === 'E2E Test Network')
      if (importedNetwork) {
        await deleteCustomNetwork(importedNetwork.id)
      }

      networkHealthMonitor.stopMonitoring()
      this.log('Step 6: Cleanup', true)

    } catch (error) {
      this.log('End-to-End Workflow', false, error.message)
    }

    console.log('')
  }

  private printSummary(): void {
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(t => t.passed).length
    const failedTests = totalTests - passedTests

    console.log('📊 Integration Test Summary:')
    console.log(`Total Tests: ${totalTests}`)
    console.log(`✅ Passed: ${passedTests}`)
    console.log(`❌ Failed: ${failedTests}`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:')
      this.testResults.filter(t => !t.passed).forEach(test => {
        console.log(`  • ${test.test}: ${test.error}`)
      })
    }

    if (passedTests === totalTests) {
      console.log('\n🎉 All integration tests passed!')
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please check the implementation.`)
    }
  }
}

// Export function to run tests
export async function runCustomNetworksIntegrationTests(): Promise<void> {
  const tester = new CustomNetworksIntegrationTester()
  await tester.runAllTests()
}
