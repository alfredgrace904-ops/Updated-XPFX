import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(artifactDir, "dist");

async function buildAll() {
  console.log("🚀 Starting build...");

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  await esbuild({
    // 🔥 IMPORTANT: fallback-safe entry resolution
    entryPoints: [
      path.resolve(artifactDir, "src/index.ts"),
      path.resolve(artifactDir, "src/index.js")
    ],

    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",

    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "pg-native",
      "mongodb-client-encryption",
      "@prisma/client",
      "playwright",
      "puppeteer",
      "electron"
    ],

    sourcemap: true,

    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],

    banner: {
      js: `
import { createRequire } from 'node:module';
globalThis.require = createRequire(import.meta.url);
      `
    }
  });

  console.log("✅ Build complete → dist ready");
}

buildAll().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});