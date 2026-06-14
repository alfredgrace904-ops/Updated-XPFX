/**
 * Centralized environment-variable access for the API server.
 * Works on any platform: Railway, Render, Fly.io, VPS, local machine.
 */

const get = (key: string): string | undefined => {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const env = {
  // Server
  PORT: get("PORT"),
  NODE_ENV: get("NODE_ENV") ?? "development",
  LOG_LEVEL: get("LOG_LEVEL") ?? "info",

  // CORS — comma-separated list of allowed origins in production
  // Example: "https://xpressprofx.com,https://admin.xpressprofx.com"
  // Leave unset to allow all origins (fine for initial testing)
  ALLOWED_ORIGINS: get("ALLOWED_ORIGINS"),

  // Demo auth
  ENABLE_DEMO_AUTH: get("ENABLE_DEMO_AUTH") === "true",

  // Admin account
  ADMIN_EMAIL: get("ADMIN_EMAIL"),
  ADMIN_PASSWORD: get("ADMIN_PASSWORD"),
  ADMIN_NOTIFY_EMAIL: get("ADMIN_NOTIFY_EMAIL"),

  // Session encryption
  SESSION_SECRET: get("SESSION_SECRET"),

  // Database
  DATABASE_URL: get("DATABASE_URL"),

  // Email - SendGrid (preferred)
  SENDGRID_API_KEY: get("SENDGRID_API_KEY"),

  // Email - SMTP fallback
  SMTP_HOST: get("SMTP_HOST"),
  SMTP_PORT: get("SMTP_PORT"),
  SMTP_USER: get("SMTP_USER"),
  SMTP_PASS: get("SMTP_PASS"),
  SMTP_FROM: get("SMTP_FROM"),

  // Blockchain RPC providers
  ALCHEMY_API_KEY: get("ALCHEMY_API_KEY"),
  INFURA_API_KEY: get("INFURA_API_KEY"),

  // MoonPay
  MOONPAY_API_KEY: get("MOONPAY_API_KEY"),
  MOONPAY_SECRET_KEY: get("MOONPAY_SECRET_KEY"),
  MOONPAY_WEBHOOK_SECRET: get("MOONPAY_WEBHOOK_SECRET"),
  MOONPAY_UNSUPPORTED_COUNTRIES: get("MOONPAY_UNSUPPORTED_COUNTRIES"),

  // Coinbase
  COINBASE_API_KEY: get("COINBASE_API_KEY"),
  COINBASE_API_SECRET: get("COINBASE_API_SECRET"),
  COINBASE_WEBHOOK_SECRET: get("COINBASE_WEBHOOK_SECRET"),

  // OpenAI
  AI_INTEGRATIONS_OPENAI_API_KEY: get("AI_INTEGRATIONS_OPENAI_API_KEY") ?? get("OPENAI_API_KEY"),
  AI_INTEGRATIONS_OPENAI_BASE_URL: get("AI_INTEGRATIONS_OPENAI_BASE_URL"),

  // Platform
  PLATFORM_RECEIVING_ADDRESS: get("PLATFORM_RECEIVING_ADDRESS"),
} as const;

export const isProduction = env.NODE_ENV === "production";
export const isDemoAuthEnabled = env.ENABLE_DEMO_AUTH && !isProduction;
export const hasSmtpCredentials = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS,
);

export function assertRequiredEnv(): { port: number } {
  const port = Number(env.PORT ?? "8080");
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${env.PORT}"`);
  }

  if (isProduction && env.MOONPAY_API_KEY && !env.MOONPAY_SECRET_KEY) {
    throw new Error(
      "MOONPAY_SECRET_KEY must be set when MOONPAY_API_KEY is configured in production.",
    );
  }

  // Startup warnings
  if (!env.SESSION_SECRET && isProduction) {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  if (!env.ALCHEMY_API_KEY && !env.INFURA_API_KEY) {
    console.warn("⚠️  ALCHEMY_API_KEY and INFURA_API_KEY both unset — using public Cloudflare RPC (rate limited)");
  }
  if (!env.SENDGRID_API_KEY && !hasSmtpCredentials) {
    console.warn("⚠️  No email provider configured — emails will be logged to console only");
  }
  if (!env.DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL not set — using in-memory store (data resets on restart)");
  }

  return { port };
}
