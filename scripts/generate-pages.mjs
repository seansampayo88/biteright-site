import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const pagesDir = path.join(rootDir, "content", "pages");
const schemaVersion = 1;

async function normalizePages() {
  const entries = await fs.readdir(pagesDir, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  await Promise.all(
    jsonFiles.map(async (entry) => {
      const filePath = path.join(pagesDir, entry.name);
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw);

      if (data.schema_version !== schemaVersion) {
        data.schema_version = schemaVersion;
        await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
      }
    })
  );
}

normalizePages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
