const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'data', 'programmatic-pages.json');
const pages = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const distDir = path.join(process.cwd(), 'dist');
const seoDir = path.join(distDir, 'seo');

fs.mkdirSync(seoDir, { recursive: true });
fs.copyFileSync(path.join(process.cwd(), 'index.html'), path.join(distDir, 'index.html'));

// Load all programmatic pages for related content
const contentPagesDir = path.join(process.cwd(), 'content', 'pages');
const allPages = fs.readdirSync(contentPagesDir)
  .filter(f => f.endsWith('.json') && !f.includes('test'))
  .map(f => {
    const content = JSON.parse(fs.readFileSync(path.join(contentPagesDir, f), 'utf8'));
    return {
      slug: content.slug,
      title: content.heading || content.title,
      topic_key: content.topic_key || '',
      description: content.verdict?.summary || content.description || ''
    };
  });

// Categorize pages for related content suggestions
function categorizePages() {
  const categories = {
    sauces: [],
    noodles: [],
    breakfast: [],
    meals: [],
    bread_baked: [],
    asian: [],
    condiments: [],
    other: []
  };

  allPages.forEach(page => {
    const topic = page.topic_key.toLowerCase();
    const title = page.title.toLowerCase();
    
    if (topic.includes('sauce') || title.includes('sauce')) {
      categories.sauces.push(page);
    } else if (topic.includes('noodle') || title.includes('noodle') || topic.includes('vermicelli') || topic.includes('pasta')) {
      categories.noodles.push(page);
    } else if (topic.includes('egg') || topic.includes('pancake') || topic.includes('waffle') || topic.includes('bacon') || topic.includes('oat') || topic.includes('hash-brown') || topic.includes('omelette')) {
      categories.breakfast.push(page);
    } else if (topic.includes('bread') || topic.includes('bagel') || topic.includes('croissant') || topic.includes('pretzel') || topic.includes('matzo') || topic.includes('crumb')) {
      categories.bread_baked.push(page);
    } else if (topic.includes('tortilla') || topic.includes('wrapper') || topic.includes('dumpling') || topic.includes('spring-roll')) {
      categories.noodles.push(page); // Group with noodles as they're similar carb bases
    } else if (topic.includes('miso') || topic.includes('ramen') || topic.includes('pho') || topic.includes('pad-thai') || topic.includes('teriyaki') || topic.includes('sushi') || topic.includes('tempura') || topic.includes('kimchi') || topic.includes('gochujang') || topic.includes('hoisin') || topic.includes('oyster') || topic.includes('soy') || topic.includes('tamari') || topic.includes('tempeh') || topic.includes('edamame')) {
      categories.asian.push(page);
    } else if (topic.includes('vinegar') || topic.includes('mustard') || topic.includes('ketchup') || topic.includes('mayonnaise') || topic.includes('tzatziki')) {
      categories.condiments.push(page);
    } else if (topic.includes('stir-fry') || topic.includes('curry') || topic.includes('chicken') || topic.includes('meatball') || topic.includes('sausage') || topic.includes('nugget') || topic.includes('fish-and-chips') || topic.includes('sweet-and-sour') || topic.includes('stuffing')) {
      categories.meals.push(page);
    } else {
      categories.other.push(page);
    }
  });

  return categories;
}

const pageCategories = categorizePages();

// Get related pages for a given page
function getRelatedPages(currentPage, count = 4) {
  const topic = currentPage.topic_key.toLowerCase();
  const title = currentPage.title.toLowerCase();
  
  // Determine primary category
  let primaryCategory = 'other';
  if (topic.includes('sauce') || title.includes('sauce')) primaryCategory = 'sauces';
  else if (topic.includes('noodle') || title.includes('noodle') || topic.includes('vermicelli') || topic.includes('pasta') || topic.includes('tortilla') || topic.includes('wrapper')) primaryCategory = 'noodles';
  else if (topic.includes('egg') || topic.includes('pancake') || topic.includes('waffle') || topic.includes('bacon') || topic.includes('oat') || topic.includes('hash-brown') || topic.includes('omelette')) primaryCategory = 'breakfast';
  else if (topic.includes('bread') || topic.includes('bagel') || topic.includes('croissant') || topic.includes('pretzel') || topic.includes('matzo') || topic.includes('crumb')) primaryCategory = 'bread_baked';
  else if (topic.includes('miso') || topic.includes('ramen') || topic.includes('pho') || topic.includes('pad-thai') || topic.includes('teriyaki') || topic.includes('sushi') || topic.includes('tempura') || topic.includes('kimchi') || topic.includes('gochujang') || topic.includes('hoisin') || topic.includes('oyster') || topic.includes('soy') || topic.includes('tamari') || topic.includes('tempeh') || topic.includes('edamame')) primaryCategory = 'asian';
  else if (topic.includes('vinegar') || topic.includes('mustard') || topic.includes('ketchup') || topic.includes('mayonnaise') || topic.includes('tzatziki')) primaryCategory = 'condiments';
  else if (topic.includes('stir-fry') || topic.includes('curry') || topic.includes('chicken') || topic.includes('meatball') || topic.includes('sausage') || topic.includes('nugget') || topic.includes('fish-and-chips') || topic.includes('sweet-and-sour') || topic.includes('stuffing')) primaryCategory = 'meals';
  
  // Get pages from same category, excluding current page
  let related = pageCategories[primaryCategory]
    .filter(p => p.slug !== currentPage.slug)
    .slice(0, count);
  
  // If we don't have enough, add from other categories
  if (related.length < count) {
    const otherCategories = Object.keys(pageCategories).filter(c => c !== primaryCategory);
    for (const cat of otherCategories) {
      const needed = count - related.length;
      if (needed <= 0) break;
      
      const additional = pageCategories[cat]
        .filter(p => p.slug !== currentPage.slug && !related.find(r => r.slug === p.slug))
        .slice(0, needed);
      
      related = related.concat(additional);
    }
  }
  
  return related.slice(0, count);
}

const buildPage = (page, relatedPages) => `<!doctype html>
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
      h2 {
        font-size: 28px;
        margin: 40px 0 20px;
        letter-spacing: -0.5px;
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
      .related-pages {
        margin-top: 48px;
        padding-top: 32px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
      .related-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }
      .related-card {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(13, 27, 42, 0.06);
        transition: transform 0.2s, box-shadow 0.2s;
        text-decoration: none;
        color: inherit;
        display: block;
      }
      .related-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 163, 111, 0.12);
      }
      .related-card h3 {
        font-size: 16px;
        margin: 0 0 8px;
        color: #0d1b2a;
        font-weight: 700;
      }
      .related-card p {
        font-size: 14px;
        color: #5f6b7a;
        margin: 0;
        line-height: 1.5;
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
        
        ${relatedPages && relatedPages.length > 0 ? `
        <section class="related-pages">
          <h2>Related Gluten-Free Guides</h2>
          <div class="related-grid">
            ${relatedPages.map(related => `
            <a class="related-card" href="/${related.slug}/">
              <h3>${related.title}</h3>
              <p>${related.description.slice(0, 80)}${related.description.length > 80 ? '...' : ''}</p>
            </a>`).join('\n            ')}
          </div>
        </section>` : ''}
      </main>
    </div>
  </body>
</html>
`;

pages.forEach(page => {
  const pageDir = path.join(seoDir, page.slug);
  fs.mkdirSync(pageDir, { recursive: true });
  
  // Find matching programmatic page for related content
  const currentFullPage = allPages.find(p => p.slug === page.slug);
  const relatedPages = currentFullPage ? getRelatedPages(currentFullPage, 4) : [];
  
  fs.writeFileSync(path.join(pageDir, 'index.html'), buildPage(page, relatedPages), 'utf8');
});

console.log(`Built ${pages.length} programmatic SEO pages with related content links.`);
