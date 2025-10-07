import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { parseEther, formatEther } from 'viem';

// Mock external dependencies
jest.mock('~/services/wallet');
jest.mock('~/utils/storage');

// Mock window.fetch
global.fetch = jest.fn();

import {
  estimateSendGas,
  checkGasSponsorship,
  sendEth,
  getTransactionHistory
} from '../transaction';
import { getAccountClient } from '~/services/wallet';
import { getSelectedNetwork, getUserSettings } from '~/utils/storage';
import { getChainById, defaultChain } from '~/config/chains';

// Mock implementations
const mockGetAccountClient = getAccountClient as jest.MockedFunction<typeof getAccountClient>;
const mockGetSelectedNetwork = getSelectedNetwork as jest.MockedFunction<typeof getSelectedNetwork>;
const mockGetUserSettings = getUserSettings as jest.MockedFunction<typeof getUserSettings>;
const mockGetChainById = getChainById as jest.MockedFunction<typeof getChainById>;
const mockDefaultChain = defaultChain;

describe('Transaction Service', () => {
  const mockClient = {
    account: { address: '0x1234567890123456789012345678901234567890' },
    estimateGas: jest.fn(),
    getGasPrice: jest.fn(),
    sendTransaction: jest.fn(),
    waitForUserOperationTransaction: jest.fn()
  };
  const mockChain = { id: 1, name: 'Ethereum' };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetAccountClient.mockResolvedValue(mockClient as any);
    mockGetSelectedNetwork.mockResolvedValue(1);
    mockGetChainById.mockReturnValue(mockChain);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({ result: { transfers: [] } })
    });
  });

  describe('estimateSendGas', () => {
    it('should estimate gas successfully', async () => {
      const mockGasLimit = 21000n;
      const mockGasPrice = 20000000000n; // 20 gwei

      mockClient.estimateGas.mockResolvedValue(mockGasLimit);
      mockClient.getGasPrice.mockResolvedValue(mockGasPrice);

      const result = await estimateSendGas('account1', '0x' + '5'.repeat(40), '1.0');

      expect(mockClient.estimateGas).toHaveBeenCalledWith({
        to: '0x' + '5'.repeat(40),
        value: parseEther('1.0')
      });
      expect(result).toMatchObject({
        gasLimit: '21000',
        gasPrice: '0.00000002',
        estimatedCost: expect.any(String),
        estimatedCostUSD: expect.any(String)
      });
      expect(parseFloat(result.estimatedCostUSD)).toBeGreaterThan(0);
    });

    it('should throw error on gas estimation failure', async () => {
      mockClient.estimateGas.mockRejectedValue(new Error('Gas estimation failed'));

      await expect(estimateSendGas('account1', '0x123', '1.0')).rejects.toThrow('Failed to estimate gas');
    });
  });

  describe('checkGasSponsorship', () => {
    it('should allow sponsorship when under threshold and enabled', async () => {
      mockGetUserSettings.mockResolvedValue({
        enableGasSponsorship: true,
        sponsorshipThresholdUSD: 5.0
      });

      const result = await checkGasSponsorship('2.50');

      expect(result).toEqual({
        canSponsor: true,
        estimatedCostUSD: '2.50',
        sponsoringCostUSD: '2.50',
        reason: undefined
      });
    });

    it('should deny sponsorship when over threshold', async () => {
      mockGetUserSettings.mockResolvedValue({
        enableGasSponsorship: true,
        sponsorshipThresholdUSD: 1.0
      });

      const result = await checkGasSponsorship('2.50');

      expect(result).toEqual({
        canSponsor: false,
        reason: 'Cost $2.50 exceeds $1 sponsorship limit',
        estimatedCostUSD: '2.50',
        sponsoringCostUSD: '0.00'
      });
    });

    it('should deny sponsorship when disabled', async () => {
      mockGetUserSettings.mockResolvedValue({
        enableGasSponsorship: false,
        sponsorshipThresholdUSD: 5.0
      });

      const result = await checkGasSponsorship('0.50');

      expect(result).toEqual({
        canSponsor: false,
        reason: 'Gas sponsorship is disabled',
        estimatedCostUSD: '0.50',
        sponsoringCostUSD: '0.00'
      });
    });

    it('should fallback to default when settings fail to load', async () => {
      mockGetUserSettings.mockRejectedValue(new Error('Settings error'));

      const result = await checkGasSponsorship('0.50');

      expect(result.canSponsor).toBe(true);
      expect(result.sponsoringCostUSD).toBe('0.50');
    });
  });

  describe('sendEth', () => {
    it('should send ETH successfully', async () => {
      const mockUserOpResult = '0xhash123';
      const mockTxHash = '0x1234567890abcdef';

      mockClient.sendTransaction.mockResolvedValue(mockUserOpResult);
      mockClient.waitForUserOperationTransaction.mockResolvedValue(mockTxHash);

      const result = await sendEth('account1', '0x' + '5'.repeat(40), '1.0', true);

      expect(mockClient.sendTransaction).toHaveBeenCalledWith({
        to: '0x' + '5'.repeat(40),
        value: parseEther('1.0')
      });
      expect(mockClient.waitForUserOperationTransaction).toHaveBeenCalledWith({
        hash: mockUserOpResult
      });
      expect(result).toBe(mockTxHash);
    });

    it('should throw error on transaction failure', async () => {
      mockClient.sendTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(sendEth('account1', '0x123', '1.0')).rejects.toThrow('Failed to send ETH');
    });
  });

  describe('getTransactionHistory', () => {
    it('should fetch transaction history successfully', async () => {
      const mockTransfers = [
        {
          hash: '0xabc123',
          from: '0x' + '1'.repeat(40),
          to: mockClient.account.address.toLowerCase(),
          value: '1.0',
          blockNum: '0x' + (1000000).toString(16),
          metadata: { blockTimestamp: '2024-01-01T00:00:00Z' }
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ result: { transfers: mockTransfers } })
      }).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          result: {
            gasUsed: '0x5208',
            effectiveGasPrice: '0x4a817c800',
            status: '0x1'
          }
        })
      });

      const result = await getTransactionHistory('account1', 10);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toMatchObject({
        hash: '0xabc123',
        type: 'receive',
        status: 'success',
        value: '1.0'
      });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle Alchemy API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ error: { message: 'API Error' } })
      });

      const result = await getTransactionHistory('account1');

      expect(result).toEqual({ transactions: [], totalCount: 0 });
    });

    it('should return empty history on fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await getTransactionHistory('account1');

      expect(result).toEqual({ transactions: [], totalCount: 0 });
    });

    it('should classify transactions correctly as send/receive', async () => {
      const mockTransfers = [
        {
          hash: '0xsend123',
          from: mockClient.account.address.toLowerCase(),
          to: '0x' + '2'.repeat(40),
          value: '0.5',
          blockNum: '0x123456',
          metadata: { blockTimestamp: '2024-01-01T00:00:00Z' }
        },
        {
          hash: '0xreceive456',
          from: '0x' + '3'.repeat(40),
          to: mockClient.account.address.toLowerCase(),
          value: '2.0',
          blockNum: '0x123457',
          metadata: { blockTimestamp: '2024-01-02T00:00:00Z' }
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({ result: { transfers: mockTransfers } })
      }).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          result: {
            gasUsed: '0x5208',
            effectiveGasPrice: '0x4a817c800',
            status: '0x1'
          }
        })
      });

      const result = await getTransactionHistory('account1');

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].type).toBe('receive'); // Newer transaction first
      expect(result.transactions[1].type).toBe('send');
      expect(result.transactions[0].value).toBe('2.0');
      expect(result.transactions[1].value).toBe('0.5');
    });
  });
});
