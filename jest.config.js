module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: [
    'lambda/**/*.ts',
    '!lambda/**/*.test.ts',
    '!lambda/**/*.spec.ts'
  ],
  coverageReporters: [
    'text',
    'json',
    'html'
  ]
};
