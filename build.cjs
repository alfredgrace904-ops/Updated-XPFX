const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function unzipAll(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      unzipAll(fullPath);
    } else if (file.endsWith(".zip")) {
      console.log("Unzipping:", fullPath);

      const targetDir = fullPath.replace(".zip", "");

      fs.mkdirSync(targetDir, { recursive: true });

      execSync(`unzip -o "${fullPath}" -d "${targetDir}"`, {
        stdio: "inherit",
      });
    }
  }
}

console.log("🚀 Starting build...");

// unzip everything in repo
unzipAll(process.cwd());

// verify output exists
const expected = path.join(
  process.cwd(),
  "artifacts/api-server/dist/index.mjs"
);

if (!fs.existsSync(expected)) {
  console.error("❌ ERROR: index.mjs not found at:");
  console.error(expected);

  console.log("📂 Available folders:");
  console.log(fs.readdirSync(process.cwd()));

  process.exit(1);
}

console.log("✅ Build completed successfully");
