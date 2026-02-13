import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const contentDir = path.join(rootDir, "content", "pages");
const distDir = path.join(rootDir, "dist");
const APP_STORE_URL = "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176";

async function copyDir(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(source, entry.name);
      const destinationPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await copyDir(sourcePath, destinationPath);
        return;
      }

      await fs.copyFile(sourcePath, destinationPath);
    })
  );
}

function normalizeStatus(status) {
  const value = String(status || "caution").toLowerCase();
  if (["safe", "low", "low-risk"].includes(value)) return "safe";
  if (["unsafe", "high", "high-risk", "avoid"].includes(value)) return "unsafe";
  return "caution";
}

function statusContent(status) {
  if (status === "safe") {
    return { label: "Likely Safe", icon: "check" };
  }
  if (status === "unsafe") {
    return { label: "High Risk", icon: "alert-triangle" };
  }
  return { label: "Use Caution", icon: "alert-circle" };
}

function renderIngredientPills(list, type) {
  return list
    .map(
      (item) =>
        `<div class="pill ${type}"><i data-feather="${type === "risk" ? "alert-circle" : "check"}" width="14"></i>${item}</div>`
    )
    .join("");
}

function renderPage(pageData) {
  const {
    title,
    description,
    heading,
    verdict,
    sections = [],
    faq = [],
    cta,
    intro,
    disclaimer,
    ingredients = {},
    waiter_script: waiterScript,
    safe_alternatives: safeAlternatives,
  } = pageData;

  const status = normalizeStatus(verdict?.status);
  const { label: verdictLabel, icon: verdictIcon } = statusContent(status);

  const riskIngredients = ingredients.risk?.length
    ? ingredients.risk
    : ["Wheat soy sauce", "Barley malt", "Shared fryer oil"];
  const safeIngredients = ingredients.safe?.length
    ? ingredients.safe
    : ["Plain rice", "Fresh vegetables"];

  const waiterPreview = waiterScript?.preview
    || `Can you confirm whether ${heading.replace(/^Is\s+/i, "").replace(/\?$/, "")} has any wheat, barley, rye, or regular soy sauce?`;

  const alternatives = safeAlternatives?.length
    ? safeAlternatives
    : ["Steamed rice", "Plain salad", "Grilled protein without sauce"];

  const overviewBody = sections[0]?.body || intro || verdict?.summary || "";
  const faqMarkup = faq
    .map(
      (item) => `
        <div class="faq-item">
          <h3>${item.question}</h3>
          <p>${item.answer}</p>
        </div>
      `
    )
    .join("");

  const updatedAt = pageData.meta?.updated_at || new Date().toISOString().slice(0, 10);
  const faqSchema =
    faq.length > 0
      ? `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        })}</script>`
      : "";
  const articleSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: pageData.title,
    description: pageData.description,
    datePublished: updatedAt,
    dateModified: updatedAt,
  })}</script>`;
  const iconDataUri =
    typeof BRAND_ICON_DATA_URI === "string" && BRAND_ICON_DATA_URI.length > 0
      ? BRAND_ICON_DATA_URI
      : "data:image/png;base64,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";

  const ctaTitle = cta?.title || "Don’t Guess. Scan.";
  const ctaBody = cta?.body || "Take a photo of the menu and get instant gluten risk guidance in the BiteRight app.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${(pageData.slug ? `https://biterightgluten.com/${pageData.slug}/` : "https://biterightgluten.com/")}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${(pageData.slug ? `https://biterightgluten.com/${pageData.slug}/` : "https://biterightgluten.com/")}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:site_name" content="BiteRight" />
    <link rel="icon" type="image/png" href="${iconDataUri}" />
    <link rel="shortcut icon" href="${iconDataUri}" />
    <link rel="apple-touch-icon" href="${iconDataUri}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
    ${articleSchema}
    ${faqSchema}
    <script src="https://unpkg.com/feather-icons"></script>
    <style>
      :root {
        --primary-teal: #00a36f;
        --accent-coral: #ff6d5e;
        --accent-apricot: #f4c16e;
        --navy: #0d1b2a;
        --text-dark: #1c1c1e;
        --text-grey: #5f6b7a;
        --glass-bg: rgba(255, 255, 255, 0.7);
        --glass-border: 1px solid rgba(255, 255, 255, 0.6);
        --blur: blur(20px);
        --radius-lg: 32px;
        --radius-sm: 16px;
        --radius-pill: 999px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Nunito", sans-serif;
        background-color: #f7f9fb;
        color: var(--text-dark);
        overflow-x: hidden;
      }
      .mesh-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        background: radial-gradient(circle at 0% 0%, rgba(0, 163, 111, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 100% 20%, rgba(244, 193, 110, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 100%, rgba(13, 27, 42, 0.05) 0%, transparent 50%);
      }
      .container { max-width: 980px; margin: 0 auto; padding: 20px; }
      .glass-card {
        background: var(--glass-bg);
        backdrop-filter: var(--blur);
        -webkit-backdrop-filter: var(--blur);
        border: var(--glass-border);
        border-radius: var(--radius-lg);
        padding: 32px;
        margin-bottom: 24px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.03);
      }
      nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0;
      }
      .logo {
        font-weight: 800;
        font-size: 24px;
        color: var(--navy);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .logo-dot { width: 12px; height: 12px; background: var(--primary-teal); border-radius: 50%; }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 16px 32px;
        border-radius: var(--radius-pill);
        text-decoration: none;
        font-weight: 700;
        font-size: 17px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .btn:hover { transform: translateY(-2px); }
      .apple-icon { flex: 0 0 auto; }
      .btn-primary {
        background: var(--navy);
        color: #fff;
        box-shadow: 0 10px 20px rgba(13, 27, 42, 0.2);
      }
      .hero-header { text-align: center; margin: 24px 0 40px; }
      .eyebrow {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-grey);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }
      h1 { font-size: 48px; line-height: 1.1; margin: 0 0 16px; color: var(--navy); }
      .status-container.unsafe { --theme: var(--accent-coral); }
      .status-container.safe { --theme: var(--primary-teal); }
      .status-container.caution { --theme: var(--accent-apricot); }
      .verdict-badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.85);
        padding: 12px 24px;
        border-radius: 50px;
        border: 2px solid var(--theme);
      }
      .verdict-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--theme);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .verdict-text { font-size: 20px; font-weight: 800; color: var(--theme); }
      .analysis-grid { display: grid; gap: 24px; grid-template-columns: 1fr; }
      @media (min-width: 720px) { .analysis-grid { grid-template-columns: 2fr 1fr; } }
      h2 { font-size: 24px; margin: 0 0 16px; color: var(--navy); }
      p { font-size: 17px; line-height: 1.6; color: var(--text-grey); margin: 0 0 16px; }
      .pill-cloud { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
      .pill {
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .pill.risk { background: rgba(255, 109, 94, 0.1); color: var(--accent-coral); }
      .pill.safe { background: rgba(0, 163, 111, 0.1); color: var(--primary-teal); }
      .chef-card-preview {
        background: var(--navy);
        color: white;
        border-radius: 24px;
        padding: 24px;
        margin-top: 12px;
        position: relative;
        overflow: hidden;
      }
      .cc-flag { position: absolute; top: -14px; right: -10px; font-size: 72px; opacity: 0.12; }
      .cc-title { font-size: 12px; opacity: 0.75; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
      .cc-text { font-size: 18px; line-height: 1.4; font-weight: 700; margin-top: 10px; }
      .app-promo { text-align: center; }
      .app-icon-lg {
        width: 64px;
        height: 64px;
        background: var(--primary-teal);
        color: white;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 20px rgba(0, 163, 111, 0.25);
        margin-bottom: 12px;
      }
      .faq-item { padding: 14px 0; border-bottom: 1px solid rgba(13, 27, 42, 0.08); }
      .faq-item h3 { margin: 0 0 8px; color: var(--navy); }
      .safe-list { margin: 0; padding-left: 20px; color: var(--text-grey); line-height: 1.7; }
      .legal { text-align: center; color: #8d96a3; font-size: 14px; margin: 40px 0 90px; }
      .sticky-cta {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: min(320px, calc(100% - 24px));
        z-index: 100;
      }
      .sticky-cta .btn { width: 100%; }
    </style>
  </head>
  <body>
    <div class="mesh-bg"></div>
    <div class="container">
      <nav>
        <div class="logo">BiteRight<div class="logo-dot"></div></div>
        <a href="${APP_STORE_URL}" class="btn btn-primary"><svg class="apple-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> Download on the App Store</a>
      </nav>

      <header class="hero-header status-container ${status}">
        <div class="eyebrow">Public Gluten Safety Analysis</div>
        <h1>${heading}</h1>
        <div class="verdict-badge">
          <div class="verdict-icon"><i data-feather="${verdictIcon}"></i></div>
          <span class="verdict-text">${verdictLabel}</span>
        </div>
      </header>

      <div class="analysis-grid">
        <div>
          <section class="glass-card">
            <h2>The Verdict</h2>
            <p><strong>${verdict?.summary || "Check ingredients before ordering."}</strong></p>
            <p>${overviewBody}</p>
          </section>

          <section class="glass-card">
            <h2>Ingredient Breakdown</h2>
            <p>Common ingredients that can change the gluten safety profile:</p>
            <div class="pill-cloud">
              ${renderIngredientPills(riskIngredients, "risk")}
              ${renderIngredientPills(safeIngredients, "safe")}
            </div>
          </section>

          <section class="glass-card">
            <h2>Waiter Script</h2>
            <p>Use this exact line to ask before ordering:</p>
            <div class="chef-card-preview">
              <div class="cc-flag">🇯🇵</div>
              <div class="cc-title">Chef Card Preview</div>
              <div class="cc-text">“${waiterPreview}”</div>
            </div>
            <p style="font-size: 14px; margin-top: 12px; text-align: center;">
              <a href="${APP_STORE_URL}" style="font-weight: 700; color: var(--primary-teal);">Get this translated in BiteRight</a>
            </p>
          </section>

          <section class="glass-card">
            <h2>FAQ</h2>
            ${faqMarkup}
          </section>

          <section class="glass-card">
            <p style="font-size:14px; margin:0;">${disclaimer || "This guidance is informational only. Always verify ingredients and preparation with the restaurant."}</p>
          </section>
        </div>

        <aside>
          <section class="glass-card app-promo">
            <div class="app-icon-lg"><i data-feather="camera"></i></div>
            <h2 style="font-size: 26px;">${ctaTitle}</h2>
            <p>${ctaBody}</p>
            <a href="${APP_STORE_URL}" class="btn btn-primary"><svg class="apple-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> Download on the App Store</a>
          </section>

          <section class="glass-card">
            <h2 style="font-size:22px;">Safe Alternatives</h2>
            <ul class="safe-list">
              ${alternatives.map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </section>
        </aside>
      </div>

      <footer class="legal">
        <p>© 2026 BiteRight. Not medical advice.</p>
        <a href="/" style="color:inherit;">Back to BiteRight home</a>
      </footer>
    </div>

    <div class="sticky-cta">
      <a href="${APP_STORE_URL}" class="btn btn-primary"><svg class="apple-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> Get the BiteRight Gluten Scanner</a>
    </div>

    <script>feather.replace();</script>
  </body>
</html>`;
}

async function buildPages() {
  await fs.rm(distDir, { recursive: true, force: true });
  await copyDir(srcDir, distDir);

  const entries = await fs.readdir(contentDir, { withFileTypes: true });
  const jsonFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  await Promise.all(
    jsonFiles.map(async (entry) => {
      const filePath = path.join(contentDir, entry.name);
      const raw = await fs.readFile(filePath, "utf-8");
      const pageData = JSON.parse(raw);
      const pageHtml = renderPage(pageData);

      const pageDir = path.join(distDir, pageData.slug);
      await fs.mkdir(pageDir, { recursive: true });
      await fs.writeFile(path.join(pageDir, "index.html"), pageHtml);
    })
  );

  await import("./generate-sitemap.mjs");
}

buildPages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
