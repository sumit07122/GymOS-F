import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const ADMIN_URL = process.env.TEST_ADMIN_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    globalSetup: ["./tests/helpers/global-setup.ts"],
    fileParallelism: false, // integration tests share one database
    testTimeout: 20_000,
    env: {
      NODE_ENV: "test",
      TEST_ADMIN_URL: ADMIN_URL,
      DATABASE_URL: "postgresql://gymos_app:test-app-password@localhost:5432/gymos_test",
      OTP_SECRET: "test-otp-secret-test-otp-secret-0123456789",
      SMS_PROVIDER: "none",
    },
  },
});
