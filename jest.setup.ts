import '@testing-library/jest-dom';

import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Chrome extension APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    session: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  windows: {
    create: jest.fn(),
    getCurrent: jest.fn()
  }
} as any;

// Mock Plasmo messaging
jest.mock('@plasmohq/messaging', () => ({
  sendToBackground: jest.fn(),
  onMessage: jest.fn()
}));

// Mock Plasmo storage
jest.mock('@plasmohq/storage', () => ({
  useStorage: jest.fn(() => [null, jest.fn()]),
  createStorage: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    watch: jest.fn()
  }))
}));
