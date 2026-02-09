const fs = require('fs');
const path = require('path');

const dataPath = path.join(process.cwd(), 'data', 'programmatic-pages.json');
const pages = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (!Array.isArray(pages) || pages.length === 0) {
  throw new Error('programmatic-pages.json must be a non-empty array.');
}

const slugPattern = /^[a-z0-9-]+$/;
const slugs = new Set();

pages.forEach((page, index) => {
  const prefix = `Page ${index + 1}`;
  const requiredFields = ['slug', 'title', 'description', 'summary', 'highlights'];
  requiredFields.forEach(field => {
    if (!page[field]) {
      throw new Error(`${prefix} is missing required field: ${field}`);
    }
  });

  if (!slugPattern.test(page.slug)) {
    throw new Error(`${prefix} slug must be lowercase with hyphens: ${page.slug}`);
  }
  if (slugs.has(page.slug)) {
    throw new Error(`${prefix} slug is duplicated: ${page.slug}`);
  }
  slugs.add(page.slug);

  if (!Array.isArray(page.highlights) || page.highlights.length < 2) {
    throw new Error(`${prefix} must include at least two highlights.`);
  }
});

console.log('Lint checks passed for programmatic SEO data.');
