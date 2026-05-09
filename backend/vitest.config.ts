import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['lib/**/*.ts', 'routes/**/*.ts'],
            exclude: ['**/*.spec.ts', '**/*.test.ts']
        },
        include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts']
    }
});