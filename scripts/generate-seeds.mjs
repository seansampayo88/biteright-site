#!/usr/bin/env node
/**
 * When all current seeds already have pages, suggests new gluten-related topics
 * via OpenAI and appends them to content/seeds/topics.txt so the page generator
 * has new seeds to run on.
 */
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

const root = process.cwd();
const seedsPath = path.join(root, "content", "seeds", "topics.txt");
const pagesDir = path.join(root, "content", "pages");
const EXCLUDED = new Set(["is-test-gluten-free", "are-test-gluten-free"]);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_NEW_SEEDS = Number.parseInt(process.env.MAX_NEW_SEEDS ?? "15", 10);

function slugify(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** True if the topic is grammatically plural (use "are" in slug). */
function isTopicPlural(topicKey) {
  const k = String(topicKey).toLowerCase();
  const pluralEndings = [
    "noodles", "waffles", "pancakes", "croissants", "breadcrumbs", "wrappers",
    "browns", "nuggets", "meatballs", "sausages", "chips", "eggs", "oats",
  ];
  if (pluralEndings.some((e) => k === e || k.endsWith("-" + e))) return true;
  const pluralExact = new Set([
    "fish-and-chips", "bacon-and-eggs", "scrambled-eggs", "overnight-oats",
    "hash-browns", "chicken-nuggets", "spring-roll-wrappers", "dumpling-wrappers",
    "panko-breadcrumbs", "tortilla-chips", "flour-tortillas", "corn-tortillas",
    "egg-rolls", "bagels", "pretzels",
  ]);
  return pluralExact.has(k);
}

function slugForTopic(topic) {
  const key = slugify(topic);
  const verb = isTopicPlural(key) ? "are" : "is";
  return `${verb}-${key}-gluten-free`;
}

async function getExistingPageSlugs() {
  const files = await fsp.readdir(pagesDir).catch(() => []);
  return new Set(
    files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .filter((s) => !EXCLUDED.has(s))
  );
}

async function getSeedsWithoutPages(seedTopics, pageSlugs) {
  const without = [];
  for (const topic of seedTopics) {
    const slug = slugForTopic(topic);
    if (!pageSlugs.has(slug)) without.push(topic);
  }
  return without;
}

async function suggestNewTopics(existingTopicKeys, count) {
  if (!OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY not set; skipping seed generation.");
    return [];
  }

  const prompt = `You are helping build a gluten-free food guide. We already have pages for these topics (one per line, lowercased with hyphens):
${[...existingTopicKeys].sort().slice(0, 200).join("\n")}

Suggest exactly ${Math.min(count, 20)} additional specific foods, ingredients, or dishes that people often search for as "is X gluten free" or "are X gluten free". Focus on:
- Common restaurant or packaged foods
- Sauces, condiments, grains, baked goods, breakfast items, Asian dishes
- One clear topic per line (e.g. "soy sauce", "egg rolls", "panko breadcrumbs")
- No numbering, no bullets, no explanation
- Do not repeat any topic we already have
Return only the list, one topic per line.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("OpenAI API error:", res.status, err);
      return [];
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const suggested = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\d.)\-\*]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, count);
    return suggested;
  } catch (err) {
    console.warn("OpenAI request failed:", err.message);
    return [];
  }
}

async function main() {
  const raw = await fsp.readFile(seedsPath, "utf-8");
  const seedTopics = [...new Set(raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];

  const existingSlugs = await getExistingPageSlugs();
  const seedsWithoutPages = await getSeedsWithoutPages(seedTopics, existingSlugs);

  if (seedsWithoutPages.length > 0) {
    console.log(
      `${seedsWithoutPages.length} seed(s) still have no page; skipping new seed generation.`
    );
    return;
  }

  const existingTopicKeys = new Set(seedTopics.map((t) => slugify(t)));
  for (const slug of existingSlugs) {
    const key = slug.replace(/^(is|are)-/, "").replace(/-gluten-free$/, "");
    existingTopicKeys.add(key);
  }

  const suggested = await suggestNewTopics(existingTopicKeys, MAX_NEW_SEEDS);
  const newTopics = suggested.filter((t) => {
    const key = slugify(t);
    return !existingTopicKeys.has(key);
  });

  if (newTopics.length === 0) {
    console.log("No new topics suggested or all were duplicates.");
    return;
  }

  const toAppend = newTopics.join("\n") + "\n";
  await fsp.appendFile(seedsPath, toAppend);
  console.log(`Appended ${newTopics.length} new seed(s) to topics.txt: ${newTopics.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
