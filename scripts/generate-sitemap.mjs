import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagesDir = path.join(root, "content", "pages");
const outPath = path.join(root, "dist", "sitemap.xml");

const SITE_ORIGIN = "https://biterightgluten.com";

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function escXml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

if (!fs.existsSync(pagesDir)) {
  console.log("No content/pages directory; skipping sitemap.");
  process.exit(0);
}

const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".json"));
const urls = [
  { loc: `${SITE_ORIGIN}/`, lastmod: today() },
  { loc: `${SITE_ORIGIN}/knowledge-hub/`, lastmod: today() },
  { loc: `${SITE_ORIGIN}/newly-diagnosed/`, lastmod: today() },
  { loc: `${SITE_ORIGIN}/hidden-gluten/`, lastmod: today() },
];

const EXCLUDED_SLUGS = new Set(["is-test-gluten-free", "are-test-gluten-free"]);

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(path.join(pagesDir, file), "utf-8"));
  const slug = json.slug || file.replace(/\.json$/, "");
  if (EXCLUDED_SLUGS.has(slug)) continue;
  const lastmod = json.meta?.updated_at || today();
  const loc = json.canonical || `${SITE_ORIGIN}/${slug}/`;
  urls.push({ loc, lastmod });
}

const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${escXml(u.loc)}</loc>
    <lastmod>${escXml(u.lastmod)}</lastmod>
  </url>`).join("\n")}
</urlset>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, "utf-8");
console.log(`Wrote sitemap: ${outPath} (${urls.length} urls)`);
