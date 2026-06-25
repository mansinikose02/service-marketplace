'use strict';

// setupFilesAfterFramework runs after the test framework is installed in the environment.
// This is the correct key for running setup files like beforeAll/afterAll hooks.
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
