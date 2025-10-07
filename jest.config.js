/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testEnvironmentOptions: {
    htmlElement: typeof HTMLElement !== 'undefined' ? HTMLElement : null,
    customExportConditions: ['']
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  testTimeout: 10000
};
