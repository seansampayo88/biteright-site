#!/usr/bin/env python3
"""Generate knowledge hub HTML from content/pages JSON files."""
import html as html_escape
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "content" / "pages"
OUT_PATH = ROOT / "src" / "knowledge-hub" / "index.html"
EXCLUDED = {"is-test-gluten-free", "are-test-gluten-free"}


def short_desc(page):
    """Generate a short description from page data."""
    verdict = page.get("verdict", {})
    summary = verdict.get("summary", "")
    if len(summary) > 80:
        return summary[:77] + "..."
    return summary


def main():
    files = sorted(f for f in PAGES_DIR.glob("*.json") if f.stem not in EXCLUDED)
    pages = []
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        slug = data.get("slug", f.stem)
        title = data.get("heading", data.get("title", slug.replace("-", " ").title()))
        pages.append((slug, title, short_desc(data)))

    pages.sort(key=lambda x: x[1].lower())

    cards_html = "\n      ".join(
        f'<a class="card" href="/{html_escape.escape(slug)}/"><h3>{html_escape.escape(title)}</h3><p>{html_escape.escape(desc)}</p></a>'
        for slug, title, desc in pages
    )

    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Knowledge Hub — Is It Gluten Free? | BiteRight</title>
  <meta name="description" content="Browse our gluten safety guides: soy sauce, teriyaki, miso, and more. Identify hidden gluten in food labels and menus." />
  <link rel="canonical" href="https://biterightgluten.com/knowledge-hub/" />
  <meta name="theme-color" content="#00A36F" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/feather-icons"></script>
  <style>
    :root {{ --paper-color: #FDFBF7; --primary-teal: #00A36F; --navy: #0D1B2A; --text-body: #5F6B7A; --radius-lg: 24px; --shadow-card: 0 10px 30px rgba(13, 27, 42, 0.05); }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: 'Nunito', sans-serif; margin: 0; background: var(--paper-color); color: var(--navy); }}
    .container {{ max-width: 980px; margin: 0 auto; padding: 0 24px; }}
    nav {{ display: flex; justify-content: space-between; align-items: center; padding: 24px 0; }}
    .logo {{ font-size: 22px; font-weight: 800; color: var(--navy); display: flex; align-items: center; gap: 8px; text-decoration: none; }}
    .logo:hover {{ color: var(--primary-teal); }}
    .logo-mark {{ width: 32px; height: 32px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }}
    .nav-links a {{ text-decoration: none; color: var(--navy); font-weight: 700; margin-left: 20px; }}
    .nav-links a:hover {{ color: var(--primary-teal); }}
    h1 {{ font-size: 36px; margin: 0 0 12px; }}
    .sub {{ color: var(--text-body); margin-bottom: 32px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }}
    .card {{ background: white; border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-card); text-decoration: none; color: inherit; display: block; transition: transform 0.2s, box-shadow 0.2s; }}
    .card:hover {{ transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,163,111,0.12); }}
    .card h3 {{ font-size: 18px; margin: 0 0 6px; color: var(--navy); }}
    .card p {{ font-size: 14px; color: var(--text-body); margin: 0; line-height: 1.4; }}
    .btn {{ display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 999px; background: var(--navy); color: #fff; text-decoration: none; font-weight: 700; margin-top: 32px; }}
    .btn:hover {{ opacity: 0.9; }}
    footer {{ margin-top: 60px; padding: 24px 0; border-top: 1px solid rgba(0,0,0,0.06); color: var(--text-body); font-size: 14px; }}
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <a href="/" class="logo" aria-label="BiteRight home">
        <img class="logo-mark" src="../img/biteright-icon.png" alt="" width="32" height="32" />
        BiteRight
      </a>
      <div class="nav-links">
        <a href="/#features">Features</a>
        <a href="/#how-it-works">How it works</a>
        <a href="/newly-diagnosed/">Newly diagnosed?</a>
        <a href="/hidden-gluten/">Hidden gluten</a>
        <a href="/#faq">FAQ</a>
      </div>
    </nav>
    <h1>Knowledge Hub</h1>
    <p class="sub">Is it gluten free? Browse our guides to hidden gluten in sauces, noodles, and everyday foods.</p>
    <div class="grid">
      {cards_html}
    </div>
    <a href="https://apps.apple.com/app/biteright-gluten-scanner/id6755896176" class="btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      Download BiteRight — 3-day free trial. Cancel anytime.
    </a>
    <footer>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>© <span id="y"></span> BiteRight. <a href="/" style="color:inherit;">Back to home</a></div>
        <div>
          <a href="https://www.instagram.com/biterightgluten" target="_blank" rel="noopener noreferrer" style="margin-left:20px; color:inherit; text-decoration:none;" aria-label="Instagram"><i data-feather="instagram" style="width:20px;height:20px;vertical-align:middle;"></i></a>
          <a href="https://www.tiktok.com/@biterightgluten" target="_blank" rel="noopener noreferrer" style="margin-left:20px; color:inherit; text-decoration:none;" aria-label="TikTok"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="vertical-align: middle;"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg></a>
        </div>
      </div>
    </footer>
  </div>
  <script>feather.replace(); document.getElementById("y").textContent = new Date().getFullYear();</script>
</body>
</html>
'''

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(html, encoding="utf-8")
    print(f"Generated knowledge hub with {len(pages)} pages: {OUT_PATH}")


if __name__ == "__main__":
    main()
