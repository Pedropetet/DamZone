import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "server/gameLogic/**/*.ts",
        "server/middleware/**/*.ts",
        "server/routes/**/*.ts",
      ],
      exclude: ["server/scripts/**", "server/__tests__/**"],
    },
  },
});
