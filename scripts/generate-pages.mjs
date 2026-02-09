import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const seedPath = path.join(root, "content", "seeds", "topics.txt");
const outDir = path.join(root, "content", "pages");

const SITE_ORIGIN = "https://biteright-site.pages.dev";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (!OPENAI_API_KEY) die("Missing OPENAI_API_KEY env var.");
if (!fs.existsSync(seedPath)) die(`Missing seed file: ${seedPath}`);

fs.mkdirSync(outDir, { recursive: true });

const topics = fs
  .readFileSync(seedPath, "utf-8")
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const maxNew = Number(process.env.MAX_NEW_PAGES || "10");

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pageExists(slug) {
  return fs.existsSync(path.join(outDir, `${slug}.json`));
}

async function callOpenAI(prompt) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const json = await res.json();

  const textOut =
    json.output?.[0]?.content?.find((c) => c.type === "output_text")?.text ??
    json.output_text;

  if (!textOut) throw new Error("No output_text from model.");
  return textOut.trim();
}

function buildPrompt(topic) {
  const slug = `is-${slugify(topic)}-gluten-free`;
  const canonical = `${SITE_ORIGIN}/${slug}/`;
  const today = new Date().toISOString().slice(0, 10);

  return `
You are generating ONE programmatic SEO page JSON for BiteRight.

Hard rules:
- Output VALID JSON ONLY. No markdown. No commentary.
- Be medically cautious. No absolutes. No diagnosis.
- If brand-dependent or uncertain, use "depends" or "unknown" in verdict.status.
- Use simple language.
- Ensure slug exactly matches: "${slug}"
- Ensure canonical exactly: "${canonical}"
- Set meta.updated_at to "${today}"
- Always include disclaimer.

Return JSON matching this shape (keys required):
schema_version, topic_key, locale, canonical, slug, title, description, heading, intro,
meta{updated_at},
verdict{status,summary},
sections[{title,body}],
faq[{question,answer}],
cta{title,body,href,label},
disclaimer.

Context:
- locale: en-NZ
- audience: coeliac and gluten sensitive
- This page is about: "${topic}"

Now generate the JSON.
`.trim();
}

let created = 0;

for (const topic of topics) {
  if (created >= maxNew) break;

  const topicKey = slugify(topic);
  const slug = `is-${topicKey}-gluten-free`;

  const fileSlug = slug;
  if (pageExists(fileSlug)) continue;

  const prompt = buildPrompt(topic);

  try {
    const out = await callOpenAI(prompt);
    const page = JSON.parse(out);

    page.schema_version = 1;
    page.topic_key = page.topic_key || topicKey;
    page.locale = "en-NZ";
    page.slug = fileSlug;
    page.canonical = `${SITE_ORIGIN}/${fileSlug}/`;

    fs.writeFileSync(
      path.join(outDir, `${fileSlug}.json`),
      JSON.stringify(page, null, 2)
    );
    created++;
    console.log(`Created: ${fileSlug}.json`);
  } catch (e) {
    console.error(`Failed for topic "${topic}":`, e.message);
  }
}

console.log(`Done. Created ${created} new pages.`);
