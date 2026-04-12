import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/index.js";

export const auth = betterAuth({
  baseURL: "http://localhost:3000/api/auth",
  trustedOrigins: ["http://localhost:5173", "http://localhost:5174"],
  secret: "ATS_CHECKER_SECRET_KEY_123",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    crossOrigin: true,
    disableCSRFCheck: true,
  },
});
