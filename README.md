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

## Cloudflare Pages settings

- **Framework preset:** None
- **Build command:** `npm run build`
- **Output directory:** `dist`
