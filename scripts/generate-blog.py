#!/usr/bin/env python3
"""Generate SEO-ready blog index + post HTML pages from content/blog/*.md."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "blog"
SRC_BLOG_DIR = ROOT / "src" / "blog"
SITE_ORIGIN = "https://biterightgluten.com"


def clamp_seo_title(title: str, max_len: int = 60):
    t = (title or '').strip()
    if len(t) <= max_len:
        return t
    cut = t[: max_len - 1]
    if ' ' in cut:
        cut = cut.rsplit(' ', 1)[0]
    return cut.rstrip(' -:;,.')


def clamp_meta_description(desc: str, max_len: int = 155):
    d = re.sub(r"\s+", " ", (desc or '').strip())
    if len(d) <= max_len:
        return d
    cut = d[: max_len - 1]
    if ' ' in cut:
        cut = cut.rsplit(' ', 1)[0]
    return cut.rstrip(' -:;,.') + '…'


def parse_frontmatter(raw: str):
    if not raw.startswith("---\n"):
        return {}, raw
    end = raw.find("\n---\n", 4)
    if end == -1:
        return {}, raw
    fm_raw = raw[4:end]
    body = raw[end + 5 :]
    data = {}
    for line in fm_raw.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        key = k.strip()
        value = v.strip()
        if value.startswith('"') and value.endswith('"'):
            value = value[1:-1]
        if value == "true":
            value = True
        elif value == "false":
            value = False
        elif value.startswith("[") and value.endswith("]"):
            value = [p.strip().strip('"') for p in value[1:-1].split(",") if p.strip()]
        data[key] = value
    return data, body


def slug_from_filename(path: Path):
    stem = path.stem
    m = re.match(r"\d{4}-\d{2}-\d{2}-(.+)$", stem)
    return m.group(1) if m else stem


def slugify_heading(text: str):
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    return re.sub(r"\s+", "-", s)


def render_inline(text: str):
    esc = html.escape(text)
    esc = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc)
    esc = re.sub(r"\*(.+?)\*", r"<em>\1</em>", esc)

    def link_repl(m):
        label = html.escape(m.group(1))
        href = html.escape(m.group(2), quote=True)
        return f'<a href="{href}">{label}</a>'

    esc = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link_repl, esc)
    return esc


def strip_internal_sections(md: str):
    lines = md.splitlines()
    out = []
    i = 0
    block_titles = {
        'seo package',
        'youtube enrichment',
        'fact-check + anti-hallucination reflection log',
        'reflection log',
        'anti-hallucination reflection log',
    }
    while i < len(lines):
        line = lines[i]
        low_line = line.strip().lower()
        # Drop TOC / inline references for internal-only sections
        if '(#seo-package)' in low_line or '(#youtube-enrichment)' in low_line or '(#fact-check--anti-hallucination-reflection-log)' in low_line:
            i += 1
            continue
        if 'fact-check + anti-hallucination reflection log' in low_line or 'anti-hallucination reflection log' in low_line or low_line == 'seo package' or low_line == 'youtube enrichment':
            i += 1
            continue
        m = re.match(r"^##\s+(.+)$", line.strip(), re.I)
        if m:
            title = m.group(1).strip().lower()
            if any(title.startswith(t) for t in block_titles):
                i += 1
                while i < len(lines) and not re.match(r"^##\s+", lines[i].strip(), re.I):
                    i += 1
                continue
        out.append(line)
        i += 1
    return "\n".join(out)


def md_to_html(md: str):
    lines = md.splitlines()
    out = []
    in_ul = False
    in_ol = False
    in_code = False

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if in_ol:
            out.append("</ol>")
            in_ol = False

    for line in lines:
        s = line.strip()

        if s.startswith("```"):
            close_lists()
            if not in_code:
                out.append("<pre><code>")
                in_code = True
            else:
                out.append("</code></pre>")
                in_code = False
            continue

        if in_code:
            out.append(html.escape(line))
            continue

        if not s:
            close_lists()
            continue

        if s == "---":
            close_lists()
            out.append("<hr />")
            continue

        hm = re.match(r"^(#{1,6})\s+(.+)$", s)
        if hm:
            close_lists()
            lvl = len(hm.group(1))
            text = hm.group(2).strip()
            out.append(f'<h{lvl} id="{slugify_heading(text)}">{html.escape(text)}</h{lvl}>')
            continue

        olm = re.match(r"^(\d+)\.\s+(.+)$", s)
        if olm:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            if not in_ol:
                out.append("<ol>")
                in_ol = True
            out.append(f"<li>{render_inline(olm.group(2))}</li>")
            continue

        ulm = re.match(r"^[-*]\s+(.+)$", s)
        if ulm:
            if in_ol:
                out.append("</ol>")
                in_ol = False
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{render_inline(ulm.group(1))}</li>")
            continue

        close_lists()
        out.append(f"<p>{render_inline(s)}</p>")

    close_lists()
    if in_code:
        out.append("</code></pre>")
    return "\n".join(out)


def base_styles():
    return """
    :root { --paper-color:#FDFBF7; --primary-teal:#00A36F; --navy:#0D1B2A; --text-body:#5F6B7A; --radius-lg:24px; --shadow-card:0 10px 30px rgba(13,27,42,.05); }
    * { box-sizing: border-box; }
    body { font-family:'Nunito',sans-serif; margin:0; background:var(--paper-color); color:var(--navy); }
    .container { max-width: 980px; margin: 0 auto; padding: 0 24px; }
    nav { display:flex; justify-content:space-between; align-items:center; padding:24px 0; }
    .logo { font-size:22px; font-weight:800; color:var(--navy); display:flex; align-items:center; gap:8px; text-decoration:none; }
    .logo:hover { color:var(--primary-teal); }
    .logo-mark { width:32px; height:32px; border-radius:8px; object-fit:cover; }
    .nav-links a { text-decoration:none; color:var(--navy); font-weight:700; margin-left:20px; }
    .nav-links a:hover { color:var(--primary-teal); }
    .nav-kebab { display:none; background:none; border:none; cursor:pointer; padding:8px; color:var(--navy); border-radius:8px; transition:background 0.2s; }
    .nav-kebab:hover { background: rgba(0,0,0,0.05); }
    .nav-kebab svg { width:24px; height:24px; }
    .nav-menu-mobile { display:none; position:absolute; top:100%; right:0; margin-top:8px; background:white; border-radius:16px; box-shadow:0 10px 40px rgba(13,27,42,0.15); padding:12px; min-width:200px; z-index:100; border:1px solid rgba(0,0,0,0.06); }
    .nav-menu-mobile.open { display:flex; flex-direction:column; gap:4px; }
    .nav-menu-mobile a { display:block; padding:12px 16px; text-decoration:none; color:var(--navy); font-weight:700; font-size:15px; border-radius:10px; transition:background 0.2s, color 0.2s; }
    .nav-menu-mobile a:hover { background: rgba(0,163,111,0.08); color: var(--primary-teal); }
    .nav-wrapper { position:relative; }
    @media (max-width: 768px) { .nav-links { display:none; } .nav-kebab { display:flex; align-items:center; justify-content:center; } }
    .main { background:#fff; border-radius:var(--radius-lg); box-shadow:var(--shadow-card); padding:28px; margin-bottom:28px; }
    h1,h2,h3 { line-height:1.2; }
    p,li { color:#334155; line-height:1.75; }
    a { color:#0f766e; }
    .meta { color:#64748b; font-size:14px; margin-bottom:14px; }
    .hero { width:100%; border-radius:16px; margin: 12px 0 24px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; }
    .card { background:white; border-radius:16px; padding:20px; box-shadow:var(--shadow-card); text-decoration:none; color:inherit; display:block; }
    .card:hover { transform:translateY(-2px); }
    .card p { margin:0; }
    footer { margin:32px 0; color:var(--text-body); font-size:14px; }
    """


def nav_html():
    return """
    <nav>
      <a href="/" class="logo" aria-label="BiteRight home">
        <img class="logo-mark" src="/img/biteright-icon.png" alt="" width="32" height="32" />
        BiteRight
      </a>
      <div class="nav-wrapper">
        <div class="nav-links">
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/knowledge-hub/">Knowledge Hub</a>
          <a href="/blog/">Blog</a>
          <a href="/gluten-free-diet/">Gluten‑free diet</a>
          <a href="/newly-diagnosed/">Newly diagnosed?</a>
          <a href="/#faq">FAQ</a>
        </div>
        <button class="nav-kebab" type="button" aria-label="Open menu" aria-expanded="false" aria-haspopup="true">
          <i data-feather="more-vertical"></i>
        </button>
        <div class="nav-menu-mobile" id="nav-menu-mobile">
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/knowledge-hub/">Knowledge Hub</a>
          <a href="/blog/">Blog</a>
          <a href="/gluten-free-diet/">Gluten‑free diet</a>
          <a href="/newly-diagnosed/">Newly diagnosed?</a>
          <a href="/#faq">FAQ</a>
        </div>
      </div>
    </nav>
    """


def post_template(title: str, desc: str, date: str, hero: str, content_html: str, slug: str, tags: list[str]):
    canonical = f"{SITE_ORIGIN}/blog/{slug}/"
    image_abs = f"{SITE_ORIGIN}{hero}" if hero.startswith("/") else hero
    seo_title = clamp_seo_title(title)
    seo_desc = clamp_meta_description(desc)
    article_schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": seo_title or title,
        "description": seo_desc,
        "datePublished": date,
        "dateModified": date,
        "author": {"@type": "Organization", "name": "BiteRight"},
        "publisher": {"@type": "Organization", "name": "BiteRight"},
        "mainEntityOfPage": canonical,
        "image": [image_abs] if image_abs else [],
        "keywords": ", ".join(tags or []),
    }
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{html.escape(seo_title)}</title>
  <meta name="description" content="{html.escape(seo_desc)}" />
  <link rel="canonical" href="{html.escape(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{html.escape(seo_title)}" />
  <meta property="og:description" content="{html.escape(seo_desc)}" />
  <meta property="og:url" content="{html.escape(canonical)}" />
  <meta property="og:image" content="{html.escape(image_abs)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{html.escape(seo_title)}" />
  <meta name="twitter:description" content="{html.escape(seo_desc)}" />
  <meta name="twitter:image" content="{html.escape(image_abs)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/feather-icons"></script>
  <style>{base_styles()}</style>
  <script type="application/ld+json">{json.dumps(article_schema)}</script>
</head>
<body>
  <div class="container">
    {nav_html()}
    <article class="main">
      <h1>{html.escape(title)}</h1>
      <div class="meta">{html.escape(date)}</div>
      {f'<img class="hero" src="{html.escape(hero)}" alt="{html.escape(title)}" />' if hero else ''}
      {content_html}
    </article>
    <footer>© BiteRight</footer>
  </div>
  <script>
    feather.replace();
    (function() {{
      var kebab = document.querySelector('.nav-kebab');
      var menu = document.getElementById('nav-menu-mobile');
      if (kebab && menu) {{
        kebab.addEventListener('click', function() {{
          var isOpen = menu.classList.toggle('open');
          kebab.setAttribute('aria-expanded', isOpen);
        }});
        document.addEventListener('click', function(e) {{
          if (!kebab.contains(e.target) && !menu.contains(e.target)) {{
            menu.classList.remove('open');
            kebab.setAttribute('aria-expanded', 'false');
          }}
        }});
      }}
    }})();
  </script>
</body>
</html>
'''


def index_template(items_html: str):
    canonical = f"{SITE_ORIGIN}/blog/"
    seo_title = clamp_seo_title("BiteRight Blog | Gluten & Coeliac Safety")
    seo_desc = clamp_meta_description("Research-backed gluten and coeliac safety guides, checklists, and practical label-reading resources.")
    webpage_schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "BiteRight Blog",
        "url": canonical,
        "description": "Research-backed gluten and coeliac safety content",
    }
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{html.escape(seo_title)}</title>
  <meta name="description" content="{html.escape(seo_desc)}" />
  <link rel="canonical" href="{canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{html.escape(seo_title)}" />
  <meta property="og:description" content="{html.escape(seo_desc)}" />
  <meta property="og:url" content="{canonical}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/feather-icons"></script>
  <style>{base_styles()}</style>
  <script type="application/ld+json">{json.dumps(webpage_schema)}</script>
</head>
<body>
  <div class="container">
    {nav_html()}
    <section class="main">
      <h1>BiteRight Blog</h1>
      <p>Research-backed gluten and coeliac safety content.</p>
      <div class="grid">{items_html}</div>
    </section>
    <footer>© BiteRight</footer>
  </div>
  <script>
    feather.replace();
    (function() {{
      var kebab = document.querySelector('.nav-kebab');
      var menu = document.getElementById('nav-menu-mobile');
      if (kebab && menu) {{
        kebab.addEventListener('click', function() {{
          var isOpen = menu.classList.toggle('open');
          kebab.setAttribute('aria-expanded', isOpen);
        }});
        document.addEventListener('click', function(e) {{
          if (!kebab.contains(e.target) && !menu.contains(e.target)) {{
            menu.classList.remove('open');
            kebab.setAttribute('aria-expanded', 'false');
          }}
        }});
      }}
    }})();
  </script>
</body>
</html>
'''


def main():
    SRC_BLOG_DIR.mkdir(parents=True, exist_ok=True)
    posts = []

    for md_path in sorted(CONTENT_DIR.glob("*.md")):
        raw = md_path.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(raw)
        if fm.get("draft", False) is True:
            # keep draft pages generated; set to False in content to publish intent
            pass
        slug = slug_from_filename(md_path)
        title = fm.get("title", slug.replace("-", " ").title())
        desc = fm.get("description", "")
        date = str(fm.get("date", ""))
        hero = fm.get("image", "")
        tags = fm.get("tags", []) if isinstance(fm.get("tags", []), list) else []

        public_body = strip_internal_sections(body)
        html_body = md_to_html(public_body)
        out_dir = SRC_BLOG_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(
            post_template(title, desc, date, hero, html_body, slug, tags),
            encoding="utf-8",
        )

        posts.append({"slug": slug, "title": title, "desc": desc, "date": date})

        if len(clamp_seo_title(title)) > 60 or len(clamp_meta_description(desc)) > 155:
            print(f"SEO clamp applied for {slug}")

    cards = []
    for p in sorted(posts, key=lambda x: x["date"], reverse=True):
        cards.append(
            f'<a class="card" href="/blog/{html.escape(p["slug"])}/">'
            f'<h3>{html.escape(p["title"])}</h3>'
            f'<p>{html.escape(p["desc"][:170])}</p>'
            f'<div class="meta">{html.escape(p["date"])}</div>'
            f'</a>'
        )

    (SRC_BLOG_DIR / "index.html").write_text(index_template("\n".join(cards)), encoding="utf-8")
    print(f"Generated blog index + {len(posts)} blog pages in {SRC_BLOG_DIR}")


if __name__ == "__main__":
    main()
