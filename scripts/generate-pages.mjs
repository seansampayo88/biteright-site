import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

const root = process.cwd();
const seedsPath = path.join(root, "content", "seeds", "topics.txt");
const outDir = path.join(root, "content", "pages");
const maxNew = Number.parseInt(process.env.MAX_NEW_PAGES ?? "10", 10);
const refreshExisting = process.env.REFRESH_EXISTING === "1";
const refreshAllExisting = process.env.REFRESH_ALL_EXISTING === "1";

function die(message) {
  console.error(message);
  process.exit(1);
}

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

function topicFromPage(page) {
  if (page.topic_key) {
    return titleCase(page.topic_key.replace(/-/g, " "));
  }

  const slug = String(page.slug || "")
    .replace(/^is-/, "")
    .replace(/-gluten-free$/, "")
    .replace(/-/g, " ");

  return titleCase(slug);
}

function profileForTopic(topicLower) {
  if (topicLower.includes("soy sauce")) {
    return {
      verdict: "unsafe",
      summary: "Traditional soy sauce is usually high risk because it is commonly brewed with wheat.",
      risk: ["Wheat", "Barley", "Hydrolyzed wheat protein"],
      safe: ["Tamari (labeled GF)", "Coconut aminos"],
      alternatives: ["Tamari", "Coconut aminos", "Salt + citrus"],
      waiter: "Is this made with wheat-based soy sauce or gluten-free tamari?",
    };
  }

  if (topicLower.includes("miso") || topicLower.includes("ramen")) {
    return {
      verdict: "unsafe",
      summary: "This dish is often high risk due to broth bases and fermented ingredients that may include barley or wheat.",
      risk: ["Barley koji", "Wheat soy sauce", "Seasoning packets"],
      safe: ["Plain tofu", "Wakame", "Rice noodles (if separate pot)"],
      alternatives: ["Clear broth", "Steamed rice", "Sashimi (no sauce)"],
      waiter: "Is the broth or paste made with barley, wheat, or regular soy sauce?",
    };
  }

  if (topicLower.includes("gochujang") || topicLower.includes("teriyaki") || topicLower.includes("oyster") || topicLower.includes("worcestershire")) {
    return {
      verdict: "unsafe",
      summary: "This sauce is frequently high risk because many recipes include wheat-based thickeners or soy sauce.",
      risk: ["Wheat flour", "Regular soy sauce", "Malt vinegar"],
      safe: ["Certified GF version", "Homemade alternate sauce"],
      alternatives: ["Salt + sesame oil", "GF tamari blend", "Fresh herb dressing"],
      waiter: "Is this sauce made with wheat flour, regular soy sauce, or malt vinegar?",
    };
  }

  if (topicLower.includes("kimchi") || topicLower.includes("fish sauce") || topicLower.includes("rice vinegar")) {
    return {
      verdict: "caution",
      summary: "This can be gluten-free, but ingredient brands and prep methods vary by kitchen and region.",
      risk: ["Added soy sauce", "Flavoring blends", "Cross-contact prep"],
      safe: ["Simple fermentation ingredients", "Rice vinegar", "Plain fish extract"],
      alternatives: ["Plain pickled vegetables", "Steamed sides", "Fresh salad"],
      waiter: "Can you confirm there is no wheat, barley, rye, or regular soy sauce in this?",
    };
  }

  return {
    verdict: "caution",
    summary: "This item may be gluten-free in some kitchens, but ingredients and preparation can still introduce risk.",
    risk: ["Soy sauce", "Malt flavoring", "Shared fryer oil"],
    safe: ["Plain rice", "Fresh vegetables"],
    alternatives: ["Steamed rice", "Plain salad", "Grilled protein without sauce"],
    waiter: `Can you confirm this has no wheat, barley, rye, regular soy sauce, or shared fryer contamination?`,
  };
}

function buildPage(topicName, existingPage = {}) {
  const topicKey = slugify(topicName);
  const slug = `is-${topicKey}-gluten-free`;
  const titleTopic = titleCase(topicName);
  const profile = profileForTopic(topicName.toLowerCase());

  return {
    schema_version: 1,
    topic_key: topicKey,
    slug,
    title: `Is ${titleTopic} Gluten Free? | BiteRight`,
    description: `Public gluten safety analysis for ${titleTopic}. See major risks, safer alternatives, and what to ask before ordering.`,
    heading: `Is ${titleTopic} gluten free?`,
    intro: `This public analysis report explains the biggest gluten risks in ${titleTopic} and how to order more safely.`,
    verdict: {
      status: profile.verdict,
      summary: profile.summary,
    },
    disclaimer:
      "This guidance is informational only. Always verify ingredients and preparation with the restaurant.",
    meta: {
      updated_at: new Date().toISOString().slice(0, 10),
      ...(existingPage.meta || {}),
    },
    sections: [
      {
        title: "Quick answer",
        body: `${titleTopic} can vary by recipe, ingredients, and cross-contact controls in the kitchen.`,
      },
      {
        title: "Common gluten risks",
        body: "Watch for hidden sources like soy sauce, malt flavoring, marinades, thickeners, and shared fryers.",
      },
      {
        title: "How BiteRight helps",
        body: "Scan menus and ingredient labels with BiteRight to get a localized gluten-risk breakdown in seconds.",
      },
    ],
    ingredients: {
      risk: profile.risk,
      safe: profile.safe,
    },
    waiter_script: {
      preview: profile.waiter,
    },
    safe_alternatives: profile.alternatives,
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
      href: "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176",
      label: "Download on the App Store",
    },
  };
}

async function generatePages() {
  const raw = await fsp.readFile(seedsPath, "utf-8");
  const topics = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  await fsp.mkdir(outDir, { recursive: true });

  const existingFiles = fs.readdirSync(outDir).filter((file) => file.endsWith(".json"));
  const existingSlugs = new Set(existingFiles.map((file) => file.replace(/\.json$/, "")));

  console.log(`Seed topics loaded: ${topics.length}`);
  console.log(`Existing pages: ${existingFiles.length}`);
  console.log(`Mode: refreshExisting=${refreshExisting} refreshAllExisting=${refreshAllExisting}`);

  let created = 0;
  let updated = 0;

  const shouldCreateOrRefreshFromSeeds = !refreshAllExisting;

  for (const topic of topics) {
    if (!shouldCreateOrRefreshFromSeeds) break;
    if (!refreshExisting && created >= maxNew) break;

    const topicKey = slugify(topic);
    const slug = `is-${topicKey}-gluten-free`;
    const outputPath = path.join(outDir, `${slug}.json`);

    const exists = existingSlugs.has(slug);
    if (exists && !refreshExisting) continue;

    let existingPage = {};
    if (exists) {
      existingPage = JSON.parse(await fsp.readFile(outputPath, "utf-8"));
    }

    const page = buildPage(topic, existingPage);
    await fsp.writeFile(outputPath, `${JSON.stringify(page, null, 2)}\n`);

    if (exists) updated += 1;
    else created += 1;
  }

  if (refreshAllExisting) {
    for (const file of existingFiles) {
      const fullPath = path.join(outDir, file);
      const existingPage = JSON.parse(await fsp.readFile(fullPath, "utf-8"));
      const topicName = topicFromPage(existingPage);
      const page = buildPage(topicName, existingPage);
      await fsp.writeFile(fullPath, `${JSON.stringify(page, null, 2)}\n`);
      updated += 1;
    }
  }

  console.log(`Done. Created ${created} new pages. Updated ${updated} pages.`);
  if (created === 0 && updated === 0) {
    die("No pages changed. Set REFRESH_EXISTING=1 or REFRESH_ALL_EXISTING=1 to regenerate existing pages.");
  }
}

generatePages().catch((error) => {
  console.error(error);
  process.exit(1);
});
