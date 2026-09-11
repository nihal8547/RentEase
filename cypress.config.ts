import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "3ex79h",
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: "http://localhost:5173",
    supportFile: false,
  },
});
