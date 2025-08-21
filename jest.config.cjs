// jest.config.cjs
/* eslint-disable @typescript-eslint/no-require-imports */
// jest.config.cjs
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': '<rootDir>/test/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|gif|webp|svg|ico)$':
      '<rootDir>/test/__mocks__/fileMock.js',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(spec|test).?(m)[jt]s?(x)',
    '<rootDir>/src/**/*.(spec|test).?(m)[jt]s?(x)',
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'], // <-- ARRAY CORRECTO
};

module.exports = createJestConfig(customJestConfig);
