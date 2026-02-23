#!/usr/bin/env python3
"""Build all programmatic SEO pages from content/pages with related content links."""
import html as html_escape
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "content" / "pages"
DIST_DIR = ROOT / "dist"
EXCLUDED = {"is-test-gluten-free", "are-test-gluten-free"}

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
    for f in sorted(PAGES_DIR.glob("*.json")):
        if f.stem in EXCLUDED:
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        pages.append({
            'slug': data.get('slug', f.stem),
            'title': data.get('heading', data.get('title', '')),
            'topic_key': data.get('topic_key', ''),
            'description': data.get('verdict', {}).get('summary', data.get('description', '')),
            'full_data': data
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

def get_related_pages(current_page, all_categories, all_pages_list, count=6):
    """Get related pages ensuring more balanced distribution."""
    primary_cat = categorize_page(current_page)
    current_index = next((i for i, p in enumerate(all_pages_list) if p['slug'] == current_page['slug']), 0)
    
    related = []
    
    # Strategy: Mix pages from same category with pages from other categories
    # Use position-based selection to ensure variety
    
    # 1. Get from same category (30-40% of links)
    same_cat_pages = [p for p in all_categories[primary_cat] 
                     if p['slug'] != current_page['slug']]
    same_cat_target = min(2, len(same_cat_pages))
    
    if same_cat_pages:
        # Use hash-based selection for consistency but variety
        indices = [(current_index * 7 + i * 11) % len(same_cat_pages) for i in range(same_cat_target)]
        related.extend([same_cat_pages[idx] for idx in set(indices)][:same_cat_target])
    
    # 2. Get from complementary categories
    complementary = {
        'sauces': ['asian', 'condiments', 'meals'],
        'noodles': ['asian', 'meals', 'sauces'],
        'breakfast': ['bread_baked', 'meals', 'noodles'],
        'meals': ['sauces', 'asian', 'noodles'],
        'bread_baked': ['breakfast', 'meals', 'other'],
        'asian': ['sauces', 'noodles', 'meals'],
        'condiments': ['sauces', 'meals', 'asian'],
        'other': ['breakfast', 'meals', 'asian', 'bread_baked']
    }
    
    preferred_cats = complementary.get(primary_cat, [])
    all_other_cats = [c for c in all_categories.keys() if c != primary_cat]
    search_order = preferred_cats + [c for c in all_other_cats if c not in preferred_cats]
    
    # 3. Fill remaining slots from other categories
    for cat_name in search_order:
        if len(related) >= count:
            break
            
        cat_pages = [p for p in all_categories[cat_name] 
                    if p['slug'] != current_page['slug'] 
                    and not any(r['slug'] == p['slug'] for r in related)]
        
        if cat_pages:
            # Use hash-based selection for this category too
            needed = min(count - len(related), max(1, len(cat_pages) // 2))
            indices = [(current_index * 13 + i * 17) % len(cat_pages) for i in range(needed * 2)]
            selected = []
            for idx in indices:
                if len(selected) >= needed:
                    break
                page = cat_pages[idx]
                if page not in selected and not any(r['slug'] == page['slug'] for r in related):
                    selected.append(page)
            related.extend(selected[:needed])
    
    return related[:count]

def build_page_html(page_data, related_pages):
    """Build HTML for a programmatic SEO page from full JSON data."""
    title = page_data.get('title', '')
    heading = page_data.get('heading', title)
    intro = page_data.get('intro', '')
    description = page_data.get('description', '')
    verdict = page_data.get('verdict', {})
    verdict_status = verdict.get('status', 'caution')
    verdict_summary = verdict.get('summary', '')
    ingredients = page_data.get('ingredients', {})
    risk_items = ingredients.get('risk', [])
    safe_items = ingredients.get('safe', [])
    safe_alternatives = page_data.get('safe_alternatives', [])
    waiter_script = page_data.get('waiter_script', {})
    waiter_preview = waiter_script.get('preview', '')
    faq = page_data.get('faq', [])
    cta = page_data.get('cta', {})
    cta_title = cta.get('title', 'Want to scan menus in seconds?')
    cta_body = cta.get('body', 'Download BiteRight to check ingredients and menu items on the go.')
    cta_href = cta.get('href', 'https://apps.apple.com/app/biteright-gluten-scanner/id6755896176')
    cta_label = cta.get('label', 'Download on the App Store')
    
    # Build verdict badge
    verdict_badges = {
        'safe': ('✓ Generally Safe', '#00a36f'),
        'caution': ('⚠ Use Caution', '#f59e0b'),
        'unsafe': ('✗ High Risk', '#ef4444')
    }
    badge_text, badge_color = verdict_badges.get(verdict_status, verdict_badges['caution'])
    
    # Build risk/safe sections
    risk_html = ''
    if risk_items:
        risk_list = '\n          '.join(f'<li>{html_escape.escape(item)}</li>' for item in risk_items)
        risk_html = f'''
        <h2>⚠️ Common Gluten Risks</h2>
        <ul class="risk-list">
          {risk_list}
        </ul>'''
    
    safe_html = ''
    if safe_items:
        safe_list = '\n          '.join(f'<li>{html_escape.escape(item)}</li>' for item in safe_items)
        safe_html = f'''
        <h2>✓ Typically Safe Options</h2>
        <ul class="safe-list">
          {safe_list}
        </ul>'''
    
    # Build alternatives section
    alternatives_html = ''
    if safe_alternatives:
        alt_list = '\n          '.join(f'<li>{html_escape.escape(item)}</li>' for item in safe_alternatives)
        alternatives_html = f'''
        <h2>Alternative Options</h2>
        <ul>
          {alt_list}
        </ul>'''
    
    # Build waiter script section
    waiter_html = ''
    if waiter_preview:
        waiter_html = f'''
        <div class="waiter-script">
          <h3>💬 What to Ask</h3>
          <p class="script-text">"{html_escape.escape(waiter_preview)}"</p>
        </div>'''
    
    # Build FAQ section
    faq_html = ''
    if faq:
        faq_items = '\n        '.join(
            f'''<div class="faq-item">
          <h3>{html_escape.escape(item.get("question", ""))}</h3>
          <p>{html_escape.escape(item.get("answer", ""))}</p>
        </div>''' for item in faq
        )
        faq_html = f'''
        <h2>Frequently Asked Questions</h2>
        <div class="faq">
        {faq_items}
        </div>'''
    
    # Build related section
    related_section = ''
    if related_pages:
        related_cards = '\n            '.join(
            f'''<a class="related-card" href="/{html_escape.escape(r["slug"])}/">
              <h3>{html_escape.escape(r["title"])}</h3>
              <p>{html_escape.escape(r["description"][:100])}{("..." if len(r["description"]) > 100 else "")}</p>
            </a>''' for r in related_pages
        )
        related_section = f'''
        <section class="related-pages">
          <h2>Related Gluten-Free Guides</h2>
          <p class="related-intro">Explore more gluten safety guides for ingredients and meals:</p>
          <div class="related-grid">
            {related_cards}
          </div>
        </section>'''
    
    return f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{html_escape.escape(title)}</title>
    <meta name="description" content="{html_escape.escape(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {{
        --paper-color: #FDFBF7;
        --primary-teal: #00A36F;
        --navy: #0D1B2A;
        --text-body: #5F6B7A;
        --safe-green: #00a36f;
        --caution-amber: #f59e0b;
        --risk-red: #ef4444;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: 'Nunito', system-ui, -apple-system, sans-serif;
        background: var(--paper-color);
        color: var(--navy);
        line-height: 1.6;
      }}
      .container {{
        max-width: 960px;
        margin: 0 auto;
        padding: 24px 24px 80px;
      }}
      a {{ color: var(--primary-teal); text-decoration: none; }}
      a:hover {{ text-decoration: underline; }}
      header {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        padding: 16px 0;
      }}
      .logo {{
        font-size: 20px;
        font-weight: 800;
        color: var(--navy);
      }}
      .badge {{
        display: inline-block;
        padding: 8px 16px;
        border-radius: 999px;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.05em;
        margin-bottom: 12px;
      }}
      .verdict-badge {{
        background: {badge_color};
        color: white;
      }}
      h1 {{
        font-size: 42px;
        margin: 16px 0 20px;
        letter-spacing: -1px;
        line-height: 1.1;
      }}
      h2 {{
        font-size: 26px;
        margin: 40px 0 16px;
        letter-spacing: -0.5px;
      }}
      h3 {{
        font-size: 18px;
        margin: 20px 0 12px;
      }}
      p {{ 
        line-height: 1.7; 
        color: var(--text-body); 
        font-size: 17px;
        margin-bottom: 16px;
      }}
      .intro {{
        font-size: 19px;
        color: var(--navy);
        margin-bottom: 24px;
      }}
      .verdict-summary {{
        background: white;
        border-radius: 16px;
        padding: 24px;
        margin: 32px 0;
        box-shadow: 0 4px 12px rgba(13, 27, 42, 0.08);
        border-left: 4px solid {badge_color};
      }}
      .verdict-summary p {{
        margin: 0;
        font-size: 17px;
        color: var(--navy);
      }}
      ul {{
        padding-left: 24px;
        margin: 16px 0 24px;
      }}
      li {{
        margin-bottom: 10px;
        color: var(--text-body);
      }}
      .risk-list li {{
        color: var(--risk-red);
      }}
      .safe-list li {{
        color: var(--safe-green);
      }}
      .waiter-script {{
        background: rgba(0, 163, 111, 0.08);
        border-radius: 16px;
        padding: 24px;
        margin: 32px 0;
      }}
      .waiter-script h3 {{
        margin-top: 0;
        color: var(--primary-teal);
      }}
      .script-text {{
        font-size: 18px;
        font-style: italic;
        color: var(--navy);
        font-weight: 600;
      }}
      .faq {{
        margin: 24px 0;
      }}
      .faq-item {{
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(13, 27, 42, 0.06);
      }}
      .faq-item h3 {{
        margin-top: 0;
        font-size: 17px;
        color: var(--navy);
      }}
      .faq-item p {{
        margin-bottom: 0;
      }}
      .cta-section {{
        background: var(--navy);
        color: white;
        border-radius: 20px;
        padding: 32px;
        margin: 48px 0;
        text-align: center;
      }}
      .cta-section h2 {{
        color: white;
        margin-top: 0;
      }}
      .cta-section p {{
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 24px;
      }}
      .cta-btn {{
        display: inline-block;
        padding: 14px 32px;
        background: var(--primary-teal);
        color: white;
        border-radius: 999px;
        font-weight: 700;
        font-size: 16px;
        text-decoration: none;
      }}
      .cta-btn:hover {{
        background: #00b87a;
        text-decoration: none;
      }}
      .related-pages {{
        margin-top: 64px;
        padding-top: 40px;
        border-top: 2px solid rgba(0, 0, 0, 0.08);
      }}
      .related-intro {{
        color: var(--text-body);
        margin-bottom: 24px;
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
        text-decoration: none;
      }}
      .related-card h3 {{
        font-size: 16px;
        margin: 0 0 8px;
        color: var(--navy);
        font-weight: 700;
      }}
      .related-card p {{
        font-size: 14px;
        color: var(--text-body);
        margin: 0;
        line-height: 1.5;
      }}
      @media (max-width: 640px) {{
        h1 {{ font-size: 32px; }}
        .related-grid {{ grid-template-columns: 1fr; }}
      }}
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="logo">BiteRight</div>
        <a href="/knowledge-hub/">← Browse All Guides</a>
      </header>
      <main>
        <div class="badge verdict-badge">{badge_text}</div>
        <h1>{html_escape.escape(heading)}</h1>
        <p class="intro">{html_escape.escape(intro)}</p>
        
        <div class="verdict-summary">
          <p>{html_escape.escape(verdict_summary)}</p>
        </div>
        {risk_html}
        {safe_html}
        {waiter_html}
        {alternatives_html}
        {faq_html}
        
        <div class="cta-section">
          <h2>{html_escape.escape(cta_title)}</h2>
          <p>{html_escape.escape(cta_body)}</p>
          <a href="{html_escape.escape(cta_href)}" class="cta-btn">{html_escape.escape(cta_label)}</a>
        </div>
        {related_section}
      </main>
    </div>
  </body>
</html>
'''

def main():
    # Load all pages
    all_pages = load_all_pages()
    page_categories = categorize_pages(all_pages)
    
    # Create dist directory
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    
    # Copy index.html if exists
    index_src = ROOT / "index.html"
    if index_src.exists():
        shutil.copy(index_src, DIST_DIR / "index.html")
    
    # Build each page
    built_count = 0
    for page in all_pages:
        page_dir = DIST_DIR / page['slug']
        page_dir.mkdir(parents=True, exist_ok=True)
        
        # Get related pages
        related = get_related_pages(page, page_categories, all_pages, 6)
        
        # Build and write HTML
        html = build_page_html(page['full_data'], related)
        (page_dir / "index.html").write_text(html, encoding="utf-8")
        built_count += 1
    
    print(f"✓ Built {built_count} programmatic SEO pages with related content links.")
    print(f"✓ Each page links to up to 6 related guides for better internal linking.")
    print(f"✓ Categories: {', '.join(f'{k}({len(v)})' for k, v in page_categories.items() if v)}")

if __name__ == "__main__":
    main()
