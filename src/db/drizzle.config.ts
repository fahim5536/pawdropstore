import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const sqlHost = process.env.SQL_HOST || "127.0.0.1";
const sqlDbName = process.env.SQL_DB_NAME || "pawdrop_db";
const user = process.env.SQL_ADMIN_USER || "postgres_admin";
const password = process.env.SQL_ADMIN_PASSWORD || "admin_password";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});
