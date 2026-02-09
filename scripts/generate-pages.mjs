import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

const root = process.cwd();
const seedsPath = path.join(root, "content", "seeds", "topics.txt");
const outDir = path.join(root, "content", "pages");
const maxNew = Number.parseInt(process.env.MAX_NEW_PAGES ?? "10", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function die(message) {
  console.error(message);
  process.exit(1);
}

if (!OPENAI_API_KEY) die("Missing OPENAI_API_KEY env var.");

function slugify(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function titleCase(topic) {
  return topic
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function generatePages() {
  const raw = await fsp.readFile(seedsPath, "utf-8");
  const topics = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  console.log(`Seed topics loaded: ${topics.length}`);
  console.log(`Max new pages this run: ${maxNew}`);
  console.log(
    `Existing pages: ${
      fs.existsSync(outDir)
        ? fs.readdirSync(outDir).filter((file) => file.endsWith(".json")).length
        : 0
    }`
  );

  await fsp.mkdir(outDir, { recursive: true });
  const existing = new Set(
    fs
      .readdirSync(outDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
  );

  let created = 0;

  for (const topic of topics) {
    if (created >= maxNew) break;

    const topicKey = slugify(topic);
    const slug = `is-${topicKey}-gluten-free`;

    if (existing.has(slug)) continue;

    const titleTopic = titleCase(topic);
    const page = {
      schema_version: 1,
      topic_key: topicKey,
      slug,
      title: `Is ${titleTopic} Gluten Free? | BiteRight`,
      description: `Learn if ${titleTopic} is gluten-free, what to watch out for, and how BiteRight can help you eat safely.`,
      heading: `Is ${titleTopic} gluten free?`,
      intro: `Use this guide as a quick reference when you're deciding whether ${titleTopic} is safe for a gluten-free lifestyle.`,
      verdict: {
        status: "depends",
        summary: `${titleTopic} can be gluten-free when prepared without gluten ingredients and cross-contact.`,
      },
      disclaimer:
        "This guidance is informational only. Always verify ingredients and preparation with the restaurant.",
      meta: {
        updated_at: new Date().toISOString().slice(0, 10),
      },
      sections: [
        {
          title: "Quick answer",
          body: `${titleTopic} can be gluten-free depending on the recipe and preparation. Always check ingredients and ask about cross-contact.`,
        },
        {
          title: "Common gluten risks",
          body: "Watch for hidden sources like malt flavoring, soy sauce, or shared fryers. These are frequent sources of cross-contact.",
        },
        {
          title: "How BiteRight helps",
          body: "Snap a menu or ingredient list with BiteRight and get an instant gluten risk assessment tailored to your location.",
        },
      ],
      faq: [
        {
          question: `Can BiteRight confirm if ${titleTopic} is gluten free?`,
          answer:
            "BiteRight highlights likely gluten risks based on ingredients and preparation. Always confirm with the kitchen if you have coeliac disease.",
        },
        {
          question: "What should I ask a restaurant?",
          answer:
            "Ask about shared equipment, sauces, marinades, and whether the kitchen has a dedicated gluten-free prep area.",
        },
      ],
      cta: {
        title: "Want to scan menus in seconds?",
        body: "Download BiteRight to check ingredients and menu items on the go.",
        href: "https://apps.apple.com/app/biteright/id000000000",
        label: "Get BiteRight",
      },
    };

    const outputPath = path.join(outDir, `${slug}.json`);
    await fsp.writeFile(outputPath, `${JSON.stringify(page, null, 2)}\n`);
    created += 1;
  }

  console.log(`Done. Created ${created} new pages.`);
  if (created === 0) {
    die("Created 0 new pages. Check topics.txt, OPENAI_API_KEY, or existing slugs.");
  }
}

generatePages().catch((error) => {
  console.error(error);
  process.exit(1);
});
