import { mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const srcIndex = path.join(rootDir, "src", "index.html");
const pageData = path.join(rootDir, "content", "pages", "is-test-gluten-free.json");
const distDir = path.join(rootDir, "dist");
const distIndex = path.join(distDir, "index.html");
const distContentDir = path.join(distDir, "content", "pages");
const distPageData = path.join(distContentDir, "is-test-gluten-free.json");

const isCheck = process.argv.includes("--check");

const ensureRequiredFiles = async () => {
  await access(srcIndex);
  await access(pageData);
};

const build = async () => {
  await ensureRequiredFiles();
  await mkdir(distDir, { recursive: true });
  await copyFile(srcIndex, distIndex);
  await mkdir(distContentDir, { recursive: true });
  await copyFile(pageData, distPageData);
  console.log("Build complete: dist/index.html");
};

const check = async () => {
  await ensureRequiredFiles();
  console.log("Check complete: required files present.");
};

try {
  if (isCheck) {
    await check();
  } else {
    await build();
  }
} catch (error) {
  console.error("Build failed:", error.message);
  process.exitCode = 1;
}
