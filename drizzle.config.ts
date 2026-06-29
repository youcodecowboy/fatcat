import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't load .env.local the way Next.js does, so do it here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer the direct (unpooled) connection for DDL/migrations — running
    // schema changes through the PgBouncer pool can be flaky.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
