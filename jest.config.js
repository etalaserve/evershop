export default {
  testEnvironment: "node",
  moduleNameMapper: {
    '^@evershop/postgres-query-builder$': '<rootDir>/packages/postgres-query-builder/dist/index.js',
    '^@evershop/postgres-query-builder/(.*)$': '<rootDir>/packages/postgres-query-builder/dist/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@evershop)/)"
  ],
  testMatch: ["**/dist/**/tests/**/unit/**/*.test.[jt]s"],
  // `.claude/worktrees/` holds git worktrees of this same repo. Each one
  // duplicates every workspace package.json, which makes jest-haste-map see
  // two `@evershop/postgres-query-builder` packages and refuse to resolve it
  // — any suite importing it then fails with "Test suite failed to run"
  // rather than an assertion, so it reads as a broken test rather than a
  // broken environment. Ignore them so a worktree left lying around can't
  // silently disable unit tests.
  modulePathIgnorePatterns: [
    "<rootDir>/packages/evershop/src/",
    "<rootDir>/.claude/worktrees/"
  ]
};
