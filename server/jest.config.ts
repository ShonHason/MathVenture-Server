module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
    testMatch: [
      '**/server/src/tests/**/*.test.ts', // Adjust to your directory structure
    ],
  };
  