import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'efv1oz',
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: true,
  },
});
