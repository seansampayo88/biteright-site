# BiteRight Marketing Site

This repo hosts the static marketing site for BiteRight plus programmatic SEO pages generated at build time.

## How it works

- Static files live in `src/`.
- Programmatic pages live in `content/pages/*.json`.
- The build script copies `src/` to `dist/` and renders JSON pages to `dist/<slug>/index.html`.

## Local build

```bash
npm install
npm run build
```

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
