import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      enabled: false,
    },
  },
});
