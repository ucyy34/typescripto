/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.js', '**/__tests__/**/*.ts', '**/?(*.)+(spec|test).+(ts|js)'],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
