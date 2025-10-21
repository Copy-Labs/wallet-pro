/**
 * Types for connected DApps management
 */

export interface ConnectedDApp {
  /** Origin URL of the connected dApp */
  origin: string;
  /** Display name of the dApp (extracted from origin) */
  name: string;
  /** Accounts connected to this dApp */
  accounts: string[];
  /** Timestamp when connection was established */
  connectedAt: number;
  /** Last time this dApp was used */
  lastUsedAt?: number;
  /** Connection permissions/status */
  status: 'active' | 'inactive';
}

/**
 * DApp connection permission levels
 */
export enum DAppPermission {
  /** Can access connected accounts */
  ACCOUNTS = 'accounts',
  /** Can sign transactions */
  TRANSACTIONS = 'transactions',
  /** Can sign messages */
  MESSAGES = 'messages'
}

/**
 * DApp security information
 */
export interface DAppSecurity {
  /** Origin URL */
  origin: string;
  /** SSL certificate status */
  sslCertificate?: 'valid' | 'invalid' | 'unknown';
  /** Known reputation score (0-100) */
  reputation?: number;
  /** Whether this is a verified dApp */
  verified?: boolean;
}
