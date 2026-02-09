import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const contentDir = path.join(rootDir, "content", "pages");
const distDir = path.join(rootDir, "dist");

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

function renderPage({
  title,
  description,
  heading,
  intro,
  sections = [],
  faq = [],
  cta,
}) {
  const sectionMarkup = sections
    .map(
      (section) => `
        <section class="section">
          <h2>${section.title}</h2>
          <p>${section.body}</p>
        </section>
      `
    )
    .join("");

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

  const ctaMarkup = cta
    ? `
      <section class="cta">
        <h2>${cta.title}</h2>
        <p>${cta.body}</p>
        <a href="${cta.href}">${cta.label}</a>
      </section>
    `
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <style>
      :root {
        --paper-color: #fdfbf7;
        --primary-teal: #00a36f;
        --navy: #0d1b2a;
        --text-body: #5f6b7a;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: "Nunito", sans-serif;
        margin: 0;
        background-color: var(--paper-color);
        color: var(--navy);
      }
      main {
        max-width: 900px;
        margin: 0 auto;
        padding: 64px 24px 80px;
      }
      h1 {
        font-size: 40px;
        margin-bottom: 16px;
      }
      .intro {
        font-size: 18px;
        line-height: 1.6;
        color: var(--text-body);
        margin-bottom: 32px;
      }
      .section {
        background: white;
        padding: 24px;
        border-radius: 20px;
        margin-bottom: 20px;
        box-shadow: 0 12px 24px rgba(13, 27, 42, 0.05);
      }
      .section h2 {
        margin-top: 0;
      }
      .faq {
        margin-top: 48px;
      }
      .faq-item {
        padding: 16px 0;
        border-bottom: 1px solid rgba(13, 27, 42, 0.1);
      }
      .cta {
        margin-top: 48px;
        padding: 32px;
        border-radius: 24px;
        background: rgba(0, 163, 111, 0.1);
      }
      .cta a {
        display: inline-block;
        margin-top: 16px;
        padding: 12px 24px;
        background: var(--navy);
        color: white;
        text-decoration: none;
        border-radius: 999px;
        font-weight: 700;
      }
      .back-link {
        display: inline-block;
        margin-top: 32px;
        color: var(--primary-teal);
        text-decoration: none;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${heading}</h1>
      <p class="intro">${intro}</p>
      ${sectionMarkup}
      <section class="faq">
        <h2>FAQ</h2>
        ${faqMarkup}
      </section>
      ${ctaMarkup}
      <a class="back-link" href="/">← Back to BiteRight</a>
    </main>
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
