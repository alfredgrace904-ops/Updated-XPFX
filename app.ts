import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { attachSession } from "./lib/session.js";
import { platformGate } from "./lib/platform-gate.js";
import { env, isProduction } from "./lib/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();

// Trust reverse proxy in production (Railway, Render, Fly, Nginx)
if (isProduction) {
  app.set("trust proxy", 1);
}

if (isProduction && !env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is required in production. Set it as an environment variable.",
  );
}
const SESSION_SECRET = env.SESSION_SECRET ?? "xpfx-dev-secret-change-me";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Universal CORS — works on any platform (Railway, Render, Fly, VPS, local)
// In production reads ALLOWED_ORIGINS env var (comma-separated).
// Falls back to allowing all origins in development.
const allowedOrigins: Set<string> | null = (() => {
  if (!isProduction) return null; // null == allow all in dev
  const raw = env.ALLOWED_ORIGINS ?? "";
  if (!raw.trim()) return null; // if not set, allow all (for easy first deploy)
  const origins = new Set<string>();
  for (const host of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    // Support both full URLs and bare hostnames
    if (host.startsWith("http")) {
      origins.add(host);
    } else {
      origins.add(`https://${host}`);
      origins.add(`http://${host}`);
    }
  }
  return origins.size > 0 ? origins : null;
})();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // server-to-server
      if (allowedOrigins === null) return callback(null, true); // allow all
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(cookieParser(SESSION_SECRET));

// CSRF protection for authenticated mutating requests in production
app.use((req, res, next) => {
  if (
    isProduction &&
    allowedOrigins !== null &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
  ) {
    const originHeader = req.headers.origin as string | undefined;
    let checkOrigin: string | undefined = originHeader;
    if (!checkOrigin && req.headers.referer) {
      try {
        checkOrigin = new URL(req.headers.referer as string).origin;
      } catch {
        checkOrigin = undefined;
      }
    }
    const hasCookie = Boolean(
      req.signedCookies?.["xpfx_sid"] ?? req.cookies?.["xpfx_sid"],
    );
    if (checkOrigin && hasCookie && !allowedOrigins.has(checkOrigin)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  next();
});

// Raw body capture for webhook signature verification
app.use(
  "/api/moonpay/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
);
app.use(
  "/api/coinbase/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachSession);
app.use(platformGate);

// Rate limiting on sensitive routes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  skip: () => !isProduction,
});

const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  skip: () => !isProduction,
});

const liveChatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => (req as typeof req & { userId?: string }).userId ?? ipKeyGenerator(req),
  message: { error: "Too many messages. Please wait before sending another." },
  skip: () => !isProduction,
});

// General API rate limit — applies to all /api routes as a baseline
const generalApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again." },
  skip: () => !isProduction,
});

app.use("/api/auth/login", authRateLimit);
app.use("/api/auth/signup", authRateLimit);
app.use("/api/auth/verify-otp", otpRateLimit);
app.use("/api/auth/resend-otp", otpRateLimit);
app.use("/api/live-chat", liveChatRateLimit);
app.use("/api", generalApiRateLimit);

app.use("/api", router);

// Serve built frontend files in production
if (isProduction) {
  const nextradeDist = path.join(__dirname, "../../nextrade/dist/public");
  const adminDist = path.join(__dirname, "../../admin-portal/dist/public");

  // Admin portal at /xpadmin
  app.use("/xpadmin", express.static(adminDist));
  app.get("/xpadmin/{*splat}", (_req, res) => {
    res.sendFile(path.join(adminDist, "index.html"));
  });

  // Main frontend at /
  app.use(express.static(nextradeDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(nextradeDist, "index.html"));
  });
}

export default app;
