import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createLightAccountAlchemyClient } from '@alchemy/aa-alchemy';
import { LocalAccountSigner } from '@alchemy/aa-core';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

// Mock external dependencies
jest.mock('@alchemy/aa-alchemy');
jest.mock('@alchemy/aa-core');
jest.mock('viem/accounts');
jest.mock('~/utils/storage');
jest.mock('~/config/alchemy');

// Import after mocking
import {
  createSmartAccount,
  getAllAccounts,
  getActiveAccount,
  switchAccount,
  deleteAccount,
  renameAccount,
  getAccountClient
} from '../wallet';
import {
  getStoredAccounts,
  saveAccounts,
  setActiveAccountId
} from '~/utils/storage';
import { getAlchemyRpcUrl } from '~/config/alchemy';

// Mock implementations
const mockCreateLightAccountAlchemyClient = createLightAccountAlchemyClient as jest.MockedFunction<typeof createLightAccountAlchemyClient>;
const mockLocalAccountSigner = LocalAccountSigner as jest.MockedClass<typeof LocalAccountSigner>;
const mockGeneratePrivateKey = generatePrivateKey as jest.MockedFunction<typeof generatePrivateKey>;
const mockPrivateKeyToAccount = privateKeyToAccount as jest.MockedFunction<typeof privateKeyToAccount>;

const mockGetStoredAccounts = getStoredAccounts as jest.MockedFunction<typeof getStoredAccounts>;
const mockSaveAccounts = saveAccounts as jest.MockedFunction<typeof saveAccounts>;
const mockSetActiveAccountId = setActiveAccountId as jest.MockedFunction<typeof setActiveAccountId>;
const mockGetAlchemyRpcUrl = getAlchemyRpcUrl as jest.MockedFunction<typeof getAlchemyRpcUrl>;

describe('Wallet Service', () => {
  const mockPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  const mockAddress = '0x742d35Cc6635C0532925a3b3F4EF0CE5B5cdD4F00';
  const mockClient = {
    account: { address: mockAddress }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGeneratePrivateKey.mockReturnValue(mockPrivateKey as any);
    mockPrivateKeyToAccount.mockReturnValue({} as any);
    mockCreateLightAccountAlchemyClient.mockResolvedValue(mockClient as any);
    mockGetAlchemyRpcUrl.mockReturnValue('https://eth-mainnet.alchemyapi.io/v2/api-key');
  });

  describe('createSmartAccount', () => {
    it('should create a new smart account successfully', async () => {
      const mockStored = { accounts: [], activeAccountId: null };
      mockGetStoredAccounts.mockResolvedValue(mockStored);

      const result = await createSmartAccount('Test Account', mainnet);

      expect(mockGeneratePrivateKey).toHaveBeenCalled();
      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
      expect(LocalAccountSigner).toHaveBeenCalled();
      expect(mockCreateLightAccountAlchemyClient).toHaveBeenCalledWith({
        chain: mainnet,
        signer: expect.any(LocalAccountSigner),
        rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/api-key'
      });
      expect(mockSaveAccounts).toHaveBeenCalled();

      expect(result).toMatchObject({
        name: 'Test Account',
        address: mockAddress,
        privateKey: mockPrivateKey
      });
      expect(result.id).toMatch(/^account_\d+_[a-z0-9]+$/);
    });

    it('should set first account as active', async () => {
      const mockStored = { accounts: [], activeAccountId: null };
      mockGetStoredAccounts.mockResolvedValue(mockStored);

      await createSmartAccount('First Account', mainnet);

      const savedData = mockSaveAccounts.mock.calls[0][0];
      expect(savedData.activeAccountId).toBeTruthy();
    });

    it('should throw error on creation failure', async () => {
      mockCreateLightAccountAlchemyClient.mockRejectedValue(new Error('Alchemy API error'));

      await expect(createSmartAccount('Test', mainnet)).rejects.toThrow('Failed to create smart account');
    });
  });

  describe('getAllAccounts', () => {
    it('should return all stored accounts', async () => {
      const mockAccounts = [{ id: '1', name: 'Account 1' }, { id: '2', name: 'Account 2' }];
      mockGetStoredAccounts.mockResolvedValue({ accounts: mockAccounts, activeAccountId: '1' });

      const result = await getAllAccounts();
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('getActiveAccount', () => {
    it('should return active account when exists', async () => {
      const mockAccount = { id: '1', name: 'Active Account' };
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [mockAccount],
        activeAccountId: '1'
      });

      const result = await getActiveAccount();
      expect(result).toEqual(mockAccount);
    });

    it('should return null when no active account', async () => {
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [],
        activeAccountId: null
      });

      const result = await getActiveAccount();
      expect(result).toBeNull();
    });
  });

  describe('switchAccount', () => {
    it('should switch to valid account and update timestamp', async () => {
      const mockAccount = {
        id: '1',
        name: 'Test Account',
        lastUsed: 1000
      };
      const mockStored = {
        accounts: [mockAccount],
        activeAccountId: null
      };
      mockGetStoredAccounts.mockResolvedValue(mockStored);

      await switchAccount('1');

      expect(mockAccount.lastUsed).toBeGreaterThan(1000);
      expect(mockSetActiveAccountId).toHaveBeenCalledWith('1');
      expect(mockSaveAccounts).toHaveBeenCalled();
    });

    it('should throw error for non-existent account', async () => {
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [],
        activeAccountId: null
      });

      await expect(switchAccount('non-existent')).rejects.toThrow('Account not found');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and switch to another if deleting active', async () => {
      const mockStored = {
        accounts: [
          { id: '1', name: 'Account 1' },
          { id: '2', name: 'Account 2' }
        ],
        activeAccountId: '1'
      };
      mockGetStoredAccounts.mockResolvedValue(mockStored);

      await deleteAccount('1');

      expect(mockStored.accounts).toHaveLength(1);
      expect(mockStored.accounts[0].id).toBe('2');
      expect(mockStored.activeAccountId).toBe('2');
    });

    it('should throw error for non-existent account', async () => {
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [],
        activeAccountId: null
      });

      await expect(deleteAccount('non-existent')).rejects.toThrow('Account not found');
    });
  });

  describe('renameAccount', () => {
    it('should rename account successfully', async () => {
      const mockAccount = { id: '1', name: 'Old Name' };
      const mockStored = {
        accounts: [mockAccount],
        activeAccountId: null
      };
      mockGetStoredAccounts.mockResolvedValue(mockStored);

      await renameAccount('1', 'New Name');

      expect(mockAccount.name).toBe('New Name');
      expect(mockSaveAccounts).toHaveBeenCalled();
    });

    it('should throw error for non-existent account', async () => {
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [],
        activeAccountId: null
      });

      await expect(renameAccount('non-existent', 'New Name')).rejects.toThrow('Account not found');
    });
  });

  describe('getAccountClient', () => {
    it('should return client for valid account', async () => {
      const mockAccount = {
        id: '1',
        privateKey: mockPrivateKey
      };
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [mockAccount],
        activeAccountId: null
      });

      const result = await getAccountClient('1', mainnet);

      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith(mockPrivateKey);
      expect(LocalAccountSigner).toHaveBeenCalled();
      expect(result).toEqual(mockClient);
    });

    it('should throw error for non-existent account', async () => {
      mockGetStoredAccounts.mockResolvedValue({
        accounts: [],
        activeAccountId: null
      });

      await expect(getAccountClient('non-existent', mainnet)).rejects.toThrow('Account not found');
    });
  });
});
