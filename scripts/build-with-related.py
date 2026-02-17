#!/usr/bin/env python3
"""Build programmatic SEO pages with related content links."""
import html as html_escape
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "programmatic-pages.json"
PAGES_DIR = ROOT / "content" / "pages"
DIST_DIR = ROOT / "dist"
SEO_DIR = DIST_DIR / "seo"

# Categories for related content
CATEGORIES = {
    'sauces': [],
    'noodles': [],
    'breakfast': [],
    'meals': [],
    'bread_baked': [],
    'asian': [],
    'condiments': [],
    'other': []
}

def load_all_pages():
    """Load all programmatic pages for related content."""
    pages = []
    for f in PAGES_DIR.glob("*.json"):
        if "test" in f.stem:
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        pages.append({
            'slug': data.get('slug', f.stem),
            'title': data.get('heading', data.get('title', '')),
            'topic_key': data.get('topic_key', ''),
            'description': data.get('verdict', {}).get('summary', data.get('description', ''))
        })
    return pages

def categorize_page(page):
    """Determine the category for a page."""
    topic = page['topic_key'].lower()
    title = page['title'].lower()
    
    if 'sauce' in topic or 'sauce' in title:
        return 'sauces'
    elif any(x in topic for x in ['noodle', 'vermicelli', 'pasta', 'tortilla', 'wrapper', 'dumpling', 'spring-roll']):
        return 'noodles'
    elif any(x in topic for x in ['egg', 'pancake', 'waffle', 'bacon', 'oat', 'hash-brown', 'omelette']):
        return 'breakfast'
    elif any(x in topic for x in ['bread', 'bagel', 'croissant', 'pretzel', 'matzo', 'crumb']):
        return 'bread_baked'
    elif any(x in topic for x in ['miso', 'ramen', 'pho', 'pad-thai', 'teriyaki', 'sushi', 'tempura', 
                                   'kimchi', 'gochujang', 'hoisin', 'oyster', 'soy', 'tamari', 
                                   'tempeh', 'edamame']):
        return 'asian'
    elif any(x in topic for x in ['vinegar', 'mustard', 'ketchup', 'mayonnaise', 'tzatziki']):
        return 'condiments'
    elif any(x in topic for x in ['stir-fry', 'curry', 'chicken', 'meatball', 'sausage', 
                                   'nugget', 'fish-and-chips', 'sweet-and-sour', 'stuffing']):
        return 'meals'
    else:
        return 'other'

def categorize_pages(all_pages):
    """Organize pages into categories."""
    categories = {k: [] for k in CATEGORIES.keys()}
    for page in all_pages:
        cat = categorize_page(page)
        categories[cat].append(page)
    return categories

def get_related_pages(current_page, all_categories, count=4):
    """Get related pages for the current page."""
    primary_cat = categorize_page(current_page)
    
    # Get pages from same category, excluding current page
    related = [p for p in all_categories[primary_cat] 
               if p['slug'] != current_page['slug']][:count]
    
    # If we don't have enough, add from other categories
    if len(related) < count:
        for cat_name, cat_pages in all_categories.items():
            if cat_name == primary_cat:
                continue
            needed = count - len(related)
            if needed <= 0:
                break
            
            additional = [p for p in cat_pages 
                         if p['slug'] != current_page['slug'] 
                         and p not in related][:needed]
            related.extend(additional)
    
    return related[:count]

def build_page_html(page, related_pages):
    """Build HTML for a programmatic SEO page."""
    highlights_html = '\n          '.join(
        f'<li>{html_escape.escape(item)}</li>' for item in page['highlights']
    )
    
    related_section = ''
    if related_pages:
        related_cards = '\n            '.join(
            f'''<a class="related-card" href="/{html_escape.escape(r["slug"])}/">
              <h3>{html_escape.escape(r["title"])}</h3>
              <p>{html_escape.escape(r["description"][:80])}{("..." if len(r["description"]) > 80 else "")}</p>
            </a>''' for r in related_pages
        )
        related_section = f'''
        <section class="related-pages">
          <h2>Related Gluten-Free Guides</h2>
          <div class="related-grid">
            {related_cards}
          </div>
        </section>'''
    
    return f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{html_escape.escape(page["title"])} | BiteRight</title>
    <meta name="description" content="{html_escape.escape(page["description"])}" />
    <style>
      body {{
        margin: 0;
        font-family: "Nunito", system-ui, -apple-system, sans-serif;
        background: #fdfbf7;
        color: #0d1b2a;
      }}
      .container {{
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 80px;
      }}
      a {{ color: #00a36f; text-decoration: none; }}
      header {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }}
      .badge {{
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(0, 163, 111, 0.12);
        color: #00a36f;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }}
      h1 {{
        font-size: 44px;
        margin: 16px 0;
        letter-spacing: -1px;
      }}
      h2 {{
        font-size: 28px;
        margin: 40px 0 20px;
        letter-spacing: -0.5px;
      }}
      p {{ line-height: 1.7; color: #5f6b7a; font-size: 18px; }}
      ul {{
        padding-left: 20px;
        margin-top: 24px;
        color: #5f6b7a;
      }}
      li {{ margin-bottom: 12px; }}
      .cta {{
        margin-top: 32px;
        display: inline-block;
        padding: 14px 26px;
        background: #0d1b2a;
        color: #fff;
        border-radius: 999px;
        font-weight: 700;
      }}
      .related-pages {{
        margin-top: 48px;
        padding-top: 32px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }}
      .related-grid {{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        margin-top: 24px;
      }}
      .related-card {{
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(13, 27, 42, 0.06);
        transition: transform 0.2s, box-shadow 0.2s;
        text-decoration: none;
        color: inherit;
        display: block;
      }}
      .related-card:hover {{
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 163, 111, 0.12);
      }}
      .related-card h3 {{
        font-size: 16px;
        margin: 0 0 8px;
        color: #0d1b2a;
        font-weight: 700;
      }}
      .related-card p {{
        font-size: 14px;
        color: #5f6b7a;
        margin: 0;
        line-height: 1.5;
      }}
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
        <h1>{html_escape.escape(page["title"])}</h1>
        <p>{html_escape.escape(page["summary"])}</p>
        <h2>Key highlights</h2>
        <ul>
          {highlights_html}
        </ul>
        <a class="cta" href="https://apps.apple.com/app/biteright-gluten-scanner/id6755896176">Try BiteRight</a>
        {related_section}
      </main>
    </div>
  </body>
</html>
'''

def main():
    # Load data
    pages = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    all_pages = load_all_pages()
    page_categories = categorize_pages(all_pages)
    
    # Create dist directory
    SEO_DIR.mkdir(parents=True, exist_ok=True)
    
    # Copy index.html
    index_src = ROOT / "index.html"
    if index_src.exists():
        shutil.copy(index_src, DIST_DIR / "index.html")
    
    # Build each page
    for page in pages:
        page_dir = SEO_DIR / page['slug']
        page_dir.mkdir(parents=True, exist_ok=True)
        
        # Find matching full page for related content
        current_full_page = next((p for p in all_pages if p['slug'] == page['slug']), None)
        related = get_related_pages(current_full_page, page_categories, 4) if current_full_page else []
        
        # Build and write HTML
        html = build_page_html(page, related)
        (page_dir / "index.html").write_text(html, encoding="utf-8")
    
    print(f"Built {len(pages)} programmatic SEO pages with related content links.")

if __name__ == "__main__":
    main()
