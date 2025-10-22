// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: [
    "node_modules",
    "<rootDir>/src"
  ],

  // An array of file extensions your modules use
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js"
  ],

  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/src/cryostat-web/__mocks__/styleMock.js',
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/src/cryostat-web/__mocks__/fileMock.js",
    "@app/(.*)": '<rootDir>/src/cryostat-web/src/app/$1',
    "@i18n/(.*)": '<rootDir>/src/cryostat-web/src/i18n/$1',
    '@console-plugin/(.*)$': '<rootDir>/src/openshift/$1',
  },

  // A preset that is used as a base for Jest's configuration
  preset: "ts-jest/presets/js-with-ts",

  // The path to a module that runs some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ["@testing-library/jest-dom"],

  // The test environment that will be used for testing.
  testEnvironment: "jsdom",

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "<rootDir>/src/openshift/**/*.test.(ts|tsx)"
  ],

  // ts-jest config option isolatedModules is deprecated and will be removed in v30
  // "isolatedModules" is now set in tsconfig-jest.json
  transform: {
    '^.+.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig-jest.json'
    }]
  },

  // An array of regexp pattern strings that are matched against all source file paths before transformation.
  // If the file path matches any of the patterns, it will not be transformed.
  transformIgnorePatterns: [
    "/node_modules/(?!(@openshift-console\\S*?|@openshift/dynamic-plugin-sdk-utils|@patternfly|d3|d3-array|internmap|delaunator|nanoid|robust-predicates|uuid))",
  ],

  roots: ['<rootDir>/src']
};
