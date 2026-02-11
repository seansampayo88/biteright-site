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

  const ctaTitle = cta?.title || "Don’t Guess. Scan.";
  const ctaBody = cta?.body || "Take a photo of the menu and get instant gluten risk guidance in the BiteRight app.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="icon" type="image/png" href="${BRAND_ICON_DATA_URI}" />
    <link rel="shortcut icon" href="${BRAND_ICON_DATA_URI}" />
    <link rel="apple-touch-icon" href="${BRAND_ICON_DATA_URI}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
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
