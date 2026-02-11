const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'data', 'programmatic-pages.json');
const pages = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const distDir = path.join(process.cwd(), 'dist');
const seoDir = path.join(distDir, 'seo');

fs.mkdirSync(seoDir, { recursive: true });
fs.copyFileSync(path.join(process.cwd(), 'index.html'), path.join(distDir, 'index.html'));

const buildPage = page => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${page.title} | BiteRight</title>
    <meta name="description" content="${page.description}" />
    <style>
      body {
        margin: 0;
        font-family: "Nunito", system-ui, -apple-system, sans-serif;
        background: #fdfbf7;
        color: #0d1b2a;
      }
      .container {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 80px;
      }
      a { color: #00a36f; text-decoration: none; }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }
      .badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(0, 163, 111, 0.12);
        color: #00a36f;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        font-size: 44px;
        margin: 16px 0;
        letter-spacing: -1px;
      }
      p { line-height: 1.7; color: #5f6b7a; font-size: 18px; }
      ul {
        padding-left: 20px;
        margin-top: 24px;
        color: #5f6b7a;
      }
      li { margin-bottom: 12px; }
      .cta {
        margin-top: 32px;
        display: inline-block;
        padding: 14px 26px;
        background: #0d1b2a;
        color: #fff;
        border-radius: 999px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="badge">BiteRight</div>
        <a href="/">Back to home</a>
      </header>
      <main>
        <span class="badge">Programmatic SEO</span>
        <h1>${page.title}</h1>
        <p>${page.summary}</p>
        <h2>Key highlights</h2>
        <ul>
          ${page.highlights.map(item => `<li>${item}</li>`).join('\n          ')}
        </ul>
        <a class="cta" href="https://apps.apple.com/app/biteright-gluten-scanner/id6755896176">Try BiteRight</a>
      </main>
    </div>
  </body>
</html>
`;

pages.forEach(page => {
  const pageDir = path.join(seoDir, page.slug);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, 'index.html'), buildPage(page), 'utf8');
});

console.log(`Built ${pages.length} programmatic SEO pages.`);
