import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const contentDir = path.join(rootDir, "content", "pages");

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const API_URL = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/responses";

const OUTPUT_SCHEMA = {
  name: "biteright_page",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      schema_version: { type: "number" },
      topic_key: { type: "string" },
      slug: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      heading: { type: "string" },
      intro: { type: "string" },
      verdict: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: { type: "string" },
          summary: { type: "string" },
        },
        required: ["status", "summary"],
      },
      disclaimer: { type: "string" },
      meta: {
        type: "object",
        additionalProperties: false,
        properties: {
          updated_at: { type: "string" },
        },
        required: ["updated_at"],
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["title", "body"],
        },
      },
      faq: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
      cta: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          href: { type: "string" },
          label: { type: "string" },
        },
        required: ["title", "body", "href", "label"],
      },
    },
    required: [
      "schema_version",
      "topic_key",
      "slug",
      "title",
      "description",
      "heading",
      "intro",
      "verdict",
      "disclaimer",
      "meta",
      "sections",
      "faq",
      "cta",
    ],
  },
};

const SYSTEM_PROMPT = `You generate programmatic SEO JSON for BiteRight pages.\n\nOutput must match the JSON schema and include top-level description, heading, intro, sections[{title, body}], faq[{question, answer}], and cta{title, body, href, label}.\nDo not nest description under meta and do not use faq items with q/a keys. Use cta, not app_cta.`;

function normalizeGeneratedPage(page) {
  const normalized = { ...page };

  if (!normalized.description && normalized.meta?.description) {
    normalized.description = normalized.meta.description;
  }

  if (normalized.meta?.description) {
    const { description, ...metaRest } = normalized.meta;
    normalized.meta = metaRest;
  }

  const ctaSource = normalized.cta ?? normalized.app_cta;
  if (ctaSource) {
    normalized.cta = {
      title: ctaSource.title ?? ctaSource.heading ?? "",
      body: ctaSource.body ?? ctaSource.copy ?? "",
      href: ctaSource.href ?? ctaSource.url ?? "",
      label: ctaSource.label ?? ctaSource.cta_label ?? "",
    };
  }
  delete normalized.app_cta;

  if (Array.isArray(normalized.faq)) {
    normalized.faq = normalized.faq
      .map((item) => ({
        question: item.question ?? item.q ?? "",
        answer: item.answer ?? item.a ?? "",
      }))
      .filter((item) => item.question && item.answer);
  }

  if (Array.isArray(normalized.sections)) {
    normalized.sections = normalized.sections
      .map((section) => ({
        title: section.title ?? section.heading ?? "",
        body: section.body ?? section.copy ?? "",
      }))
      .filter((section) => section.title && section.body);
  }

  return normalized;
}

async function callOpenAI({ topic }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a JSON page for topic: ${JSON.stringify(topic)}.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: OUTPUT_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const outputText = data.output_text ?? data.output?.[0]?.content?.[0]?.text;

  if (!outputText) {
    throw new Error("No output_text received from OpenAI response.");
  }

  return JSON.parse(outputText);
}

async function generatePages(inputPath) {
  const raw = await fs.readFile(inputPath, "utf-8");
  const topics = JSON.parse(raw);

  if (!Array.isArray(topics)) {
    throw new Error("Input JSON must be an array of topics.");
  }

  await fs.mkdir(contentDir, { recursive: true });

  for (const topic of topics) {
    const generated = await callOpenAI({ topic });
    const page = normalizeGeneratedPage(generated);
    const outPath = path.join(contentDir, `${page.slug}.json`);
    await fs.writeFile(outPath, `${JSON.stringify(page, null, 2)}\n`);
    console.log(`Wrote ${outPath}`);
  }
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/generate-pages.mjs <topics.json>");
  process.exit(1);
}

generatePages(path.resolve(inputPath)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
