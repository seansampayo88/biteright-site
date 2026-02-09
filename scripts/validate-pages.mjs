import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesDir = path.join(root, "content", "pages");

const REQUIRED_TOP = ["schema_version", "topic_key", "slug", "title", "verdict", "disclaimer"];

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!fs.existsSync(pagesDir)) {
  console.log("No content/pages directory; skipping validation.");
  process.exit(0);
}

const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const full = path.join(pagesDir, file);
  const json = JSON.parse(fs.readFileSync(full, "utf-8"));

  for (const k of REQUIRED_TOP) {
    if (json[k] === undefined) die(`Missing '${k}' in ${file}`);
  }

  const expectedSlug = file.replace(/\.json$/, "");
  if (json.slug !== expectedSlug) {
    die(`Slug mismatch in ${file}: slug='${json.slug}' filename='${expectedSlug}'`);
  }

  const status = json.verdict?.status;
  if (!status) die(`Missing verdict.status in ${file}`);
  const summary = json.verdict?.summary;
  if (!summary) die(`Missing verdict.summary in ${file}`);

  // Optional guardrail
  if (!json.disclaimer || json.disclaimer.length < 10) die(`Disclaimer too short in ${file}`);
}

console.log(`Validated ${files.length} programmatic pages.`);
