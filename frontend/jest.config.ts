import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
    testEnvironment: "jest-fixed-jsdom",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/?(*.)+(spec|test).ts", "**/?(*.)+(spec|test).tsx"],
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    jsx: "react-jsx",
                    esModuleInterop: true,
                },
            },
        ],
    },
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/main.tsx", // Exclude main entry file from coverage
        "!src/vite-env.d.ts",
        "!src/**/__tests__/**",
        "!src/**/*.test.{ts,tsx}",
        "!src/**/*.spec.{ts,tsx}",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html", "json"],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "jest-transform-stub",
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    testPathIgnorePatterns: ["/node_modules/", "/dist/", "<rootDir>/src/__tests__/__mocks__/", "<rootDir>/src/__tests__/setup.ts"   ],
    verbose: true,
    preset: "ts-jest",
};

export default config;
