const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

execSync('node scripts/build.js', { stdio: 'inherit' });

const dataPath = path.join(process.cwd(), 'data', 'programmatic-pages.json');
const pages = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error('Expected dist/index.html to exist after build.');
}

pages.forEach(page => {
  const pagePath = path.join(distDir, 'seo', page.slug, 'index.html');
  if (!fs.existsSync(pagePath)) {
    throw new Error(`Missing build output for ${page.slug}`);
  }
});

console.log('Build output tests passed.');
