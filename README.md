# BiteRight Marketing Site

This repo hosts the static marketing site for BiteRight plus programmatic SEO pages generated at build time.

## How it works

- Static files live in `src/`.
- Programmatic pages live in `content/pages/*.json`.
- The build script renders JSON pages to `dist/<slug>/index.html` with related content links.
- Each page includes a "Related Gluten-Free Guides" section with 6 contextually relevant links.

## Local build

```bash
npm install
npm run build
```

This builds all 70+ programmatic pages with:
- Full gluten safety analysis
- Related pages section for internal linking (6 links per page)
- Knowledge hub index linking to all pages

## Verifying internal links

```bash
npm run verify-links
```

This shows the distribution of internal links across all pages. Target: 77%+ of pages with 3+ internal links for optimal SEO indexation.

## Generating programmatic pages

```bash
# Set OPENAI_API_KEY for topic-specific ingredient analysis (recommended)
export OPENAI_API_KEY=sk-...

# Create new pages from content/seeds/topics.txt
npm run generate-pages

# Refresh specific pages with OpenAI (e.g. after adding generic pages)
npm run refresh-pages

# Or use Python (no Node required) — set OPENAI_API_KEY or add to .env
python3 scripts/refresh-pages-py.py
```

Without `OPENAI_API_KEY`, the script uses fallback profiles with generic ingredient lists. With OpenAI, each page gets unique risk/safe ingredients and gluten assessments. Create `.env` with `OPENAI_API_KEY=sk-...` to avoid passing the key each time.

## Internal Linking Strategy

The build system automatically categorizes pages and creates internal links:

- **Categories**: sauces, noodles, breakfast, meals, bread_baked, asian, condiments, other
- **Related Links**: Each page links to 6 related pages (2-3 from same category, 3-4 from complementary categories)
- **Knowledge Hub**: Links to all 70+ programmatic pages from the main index

This ensures:
- Every page receives multiple incoming links (3-16 links per page)
- Google sees pages as unique and interconnected
- Better crawlability and indexation
