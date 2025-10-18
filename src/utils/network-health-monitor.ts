import { createPublicClient, http, type Chain } from "viem"
import { getCustomNetworks, updateCustomNetworkStatus, updateCustomNetworkLastUsed } from "./storage"
import { useUIStore } from "~/store/ui-store"

// Network health check interval (30 seconds)
const HEALTH_CHECK_INTERVAL = 30000

// Maximum number of retries for failed networks
const MAX_RETRIES = 3

// Retry delays in milliseconds
const RETRY_DELAYS = [1000, 2000, 5000]

interface NetworkHealthState {
  isMonitoring: boolean
  intervals: Map<string, NodeJS.Timeout>
  retryCounts: Map<string, number>
  lastHealthCheck: Map<string, number>
}

class NetworkHealthMonitor {
  private static instance: NetworkHealthMonitor
  private healthState: NetworkHealthState = {
    isMonitoring: false,
    intervals: new Map(),
    retryCounts: new Map(),
    lastHealthCheck: new Map()
  }

  static getInstance(): NetworkHealthMonitor {
    if (!NetworkHealthMonitor.instance) {
      NetworkHealthMonitor.instance = new NetworkHealthMonitor()
    }
    return NetworkHealthMonitor.instance
  }

  // Start monitoring all custom networks
  async startMonitoring(): Promise<void> {
    if (this.healthState.isMonitoring) {
      return
    }

    try {
      const customNetworks = await getCustomNetworks()

      for (const network of customNetworks) {
        await this.startMonitoringNetwork(network.id)
      }

      this.healthState.isMonitoring = true
      console.log('Network health monitoring started')
    } catch (error) {
      console.error('Failed to start network health monitoring:', error)
    }
  }

  // Stop monitoring all networks
  stopMonitoring(): void {
    for (const [networkId, interval] of this.healthState.intervals) {
      clearInterval(interval)
    }

    this.healthState.intervals.clear()
    this.healthState.retryCounts.clear()
    this.healthState.lastHealthCheck.clear()
    this.healthState.isMonitoring = false

    console.log('Network health monitoring stopped')
  }

  // Start monitoring a specific network
  private async startMonitoringNetwork(networkId: string): Promise<void> {
    // Clear any existing interval for this network
    if (this.healthState.intervals.has(networkId)) {
      clearInterval(this.healthState.intervals.get(networkId)!)
    }

    // Set up health check interval
    const interval = setInterval(async () => {
      await this.checkNetworkHealth(networkId)
    }, HEALTH_CHECK_INTERVAL)

    this.healthState.intervals.set(networkId, interval)

    // Perform initial health check
    await this.checkNetworkHealth(networkId)
  }

  // Stop monitoring a specific network
  private stopMonitoringNetwork(networkId: string): void {
    const interval = this.healthState.intervals.get(networkId)
    if (interval) {
      clearInterval(interval)
      this.healthState.intervals.delete(networkId)
    }

    this.healthState.retryCounts.delete(networkId)
    this.healthState.lastHealthCheck.delete(networkId)
  }

  // Check health of a specific network
  private async checkNetworkHealth(networkId: string): Promise<void> {
    try {
      const customNetworks = await getCustomNetworks()
      const network = customNetworks.find(n => n.id === networkId)

      if (!network) {
        this.stopMonitoringNetwork(networkId)
        return
      }

      // Skip if we checked this network recently (within last 10 seconds)
      const lastCheck = this.healthState.lastHealthCheck.get(networkId) || 0
      if (Date.now() - lastCheck < 10000) {
        return
      }

      this.healthState.lastHealthCheck.set(networkId, Date.now())

      // Set status to checking
      await updateCustomNetworkStatus(networkId, 'checking')
      useUIStore.getState().setCustomNetworkStatus(networkId, 'checking')

      // Create a temporary chain object for the custom network
      const tempChain: Chain = {
        id: network.chainId,
        name: network.name,
        nativeCurrency: network.currency,
        rpcUrls: {
          default: { http: [network.rpcUrl] }
        },
        blockExplorers: network.blockExplorerUrl ? {
          default: { name: 'Explorer', url: network.blockExplorerUrl }
        } : undefined,
        testnet: false
      }

      // Create client and test connectivity
      const client = createPublicClient({
        chain: tempChain,
        transport: http(network.rpcUrl)
      })

      // Test with multiple RPC methods for better reliability
      const healthTests = await Promise.allSettled([
        client.getBlockNumber(),
        client.getChainId(),
        client.getGasPrice()
      ])

      // Consider network healthy if at least one test passes
      const hasSuccess = healthTests.some(result => result.status === 'fulfilled')

      if (hasSuccess) {
        await updateCustomNetworkStatus(networkId, 'online')
        useUIStore.getState().setCustomNetworkStatus(networkId, 'online')
        this.healthState.retryCounts.delete(networkId) // Reset retry count on success
      } else {
        await this.handleHealthCheckFailure(networkId, network)
      }

    } catch (error) {
      console.error(`Health check failed for network ${networkId}:`, error)
      await this.handleHealthCheckFailure(networkId)
    }
  }

  // Handle health check failure with retry logic
  private async handleHealthCheckFailure(networkId: string, network?: any): Promise<void> {
    const retryCount = this.healthState.retryCounts.get(networkId) || 0

    if (retryCount < MAX_RETRIES) {
      // Schedule retry with exponential backoff
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1]

      this.healthState.retryCounts.set(networkId, retryCount + 1)

      setTimeout(async () => {
        await this.checkNetworkHealth(networkId)
      }, delay)
    } else {
      // Max retries reached, mark as offline
      await updateCustomNetworkStatus(networkId, 'offline')
      useUIStore.getState().setCustomNetworkStatus(networkId, 'offline')

      // Reset retry count for next health check cycle
      this.healthState.retryCounts.delete(networkId)
    }
  }

  // Add a new network to monitoring
  async addNetworkToMonitoring(networkId: string): Promise<void> {
    if (this.healthState.isMonitoring) {
      await this.startMonitoringNetwork(networkId)
    }
  }

  // Remove a network from monitoring
  async removeNetworkFromMonitoring(networkId: string): Promise<void> {
    this.stopMonitoringNetwork(networkId)
  }

  // Update network in monitoring (e.g., when RPC URL changes)
  async updateNetworkInMonitoring(networkId: string): Promise<void> {
    this.stopMonitoringNetwork(networkId)
    if (this.healthState.isMonitoring) {
      await this.startMonitoringNetwork(networkId)
    }
  }

  // Get current health state
  getHealthState(): NetworkHealthState {
    return { ...this.healthState }
  }

  // Manual health check for a specific network
  async checkNetworkHealthManually(networkId: string): Promise<boolean> {
    try {
      await this.checkNetworkHealth(networkId)
      const customNetworks = await getCustomNetworks()
      const network = customNetworks.find(n => n.id === networkId)
      return network?.status === 'online'
    } catch (error) {
      console.error(`Manual health check failed for network ${networkId}:`, error)
      return false
    }
  }
}

// Export singleton instance
export const networkHealthMonitor = NetworkHealthMonitor.getInstance()

// React hook for using network health monitor
export function useNetworkHealthMonitor() {
  return {
    startMonitoring: () => networkHealthMonitor.startMonitoring(),
    stopMonitoring: () => networkHealthMonitor.stopMonitoring(),
    addNetworkToMonitoring: (networkId: string) => networkHealthMonitor.addNetworkToMonitoring(networkId),
    removeNetworkFromMonitoring: (networkId: string) => networkHealthMonitor.removeNetworkFromMonitoring(networkId),
    updateNetworkInMonitoring: (networkId: string) => networkHealthMonitor.updateNetworkInMonitoring(networkId),
    checkNetworkHealthManually: (networkId: string) => networkHealthMonitor.checkNetworkHealthManually(networkId),
    getHealthState: () => networkHealthMonitor.getHealthState()
  }
}
