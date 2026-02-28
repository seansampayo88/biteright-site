#!/usr/bin/env python3
"""Generate blog index + post HTML pages from content/blog/*.md."""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "blog"
SRC_BLOG_DIR = ROOT / "src" / "blog"


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
            parts = [p.strip().strip('"') for p in value[1:-1].split(",") if p.strip()]
            value = parts
        data[key] = value
    return data, body


def slug_from_filename(path: Path):
    stem = path.stem
    m = re.match(r"\d{4}-\d{2}-\d{2}-(.+)$", stem)
    return m.group(1) if m else stem


def slugify_heading(text: str):
    s = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    return re.sub(r"\s+", "-", s)


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
        raw = line.rstrip("\n")
        s = raw.strip()

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
            out.append(html.escape(raw))
            continue

        if not s:
            close_lists()
            continue

        if s == "---":
            close_lists()
            out.append("<hr />")
            continue

        h = re.match(r"^(#{1,6})\s+(.+)$", s)
        if h:
            close_lists()
            level = len(h.group(1))
            text = h.group(2).strip()
            anchor = slugify_heading(text)
            out.append(f'<h{level} id="{anchor}">{html.escape(text)}</h{level}>')
            continue

        m_ol = re.match(r"^(\d+)\.\s+(.+)$", s)
        if m_ol:
            if in_ul:
                out.append("</ul>")
                in_ul = False
            if not in_ol:
                out.append("<ol>")
                in_ol = True
            out.append(f"<li>{render_inline(m_ol.group(2))}</li>")
            continue

        m_ul = re.match(r"^[-*]\s+(.+)$", s)
        if m_ul:
            if in_ol:
                out.append("</ol>")
                in_ol = False
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append(f"<li>{render_inline(m_ul.group(1))}</li>")
            continue

        close_lists()
        out.append(f"<p>{render_inline(s)}</p>")

    close_lists()
    if in_code:
        out.append("</code></pre>")
    return "\n".join(out)


def render_inline(text: str):
    esc = html.escape(text)
    esc = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc)
    esc = re.sub(r"\*(.+?)\*", r"<em>\1</em>", esc)

    def repl(m):
        label = html.escape(m.group(1))
        href = html.escape(m.group(2), quote=True)
        return f'<a href="{href}">{label}</a>'

    esc = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", repl, esc)
    return esc


def post_template(title: str, desc: str, date: str, hero: str, content_html: str):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{html.escape(title)} | BiteRight Blog</title>
  <meta name="description" content="{html.escape(desc)}" />
  <link rel="canonical" href="https://biterightgluten.com/blog/" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body{{font-family:'Nunito',sans-serif;background:#FDFBF7;color:#0D1B2A;margin:0}}
    .container{{max-width:860px;margin:0 auto;padding:24px}}
    nav{{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:20px}}
    nav a{{text-decoration:none;color:#0D1B2A;font-weight:700}}
    nav a:hover{{color:#00A36F}}
    .hero{{width:100%;border-radius:18px;margin:16px 0 24px}}
    article h1, article h2, article h3{{line-height:1.2}}
    article p, article li{{line-height:1.7;color:#334155}}
    article a{{color:#0ea5a5}}
    hr{{border:none;border-top:1px solid #e5e7eb;margin:24px 0}}
    .meta{{color:#64748b;font-size:14px;margin-bottom:12px}}
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <a href="/">Home</a>
      <a href="/knowledge-hub/">Knowledge Hub</a>
      <a href="/blog/">Blog</a>
      <a href="/gluten-free-diet/">Gluten-free diet</a>
      <a href="/newly-diagnosed/">Newly diagnosed?</a>
    </nav>
    <article>
      <h1>{html.escape(title)}</h1>
      <div class="meta">{html.escape(date)}</div>
      {f'<img class="hero" src="{html.escape(hero)}" alt="{html.escape(title)}" />' if hero else ''}
      {content_html}
    </article>
  </div>
</body>
</html>
'''


def index_template(items_html: str):
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>BiteRight Blog</title>
  <meta name="description" content="Research-backed gluten safety guides, checklists, and practical coeliac resources." />
  <link rel="canonical" href="https://biterightgluten.com/blog/" />
  <style>
    body{{font-family:'Nunito',sans-serif;background:#FDFBF7;color:#0D1B2A;margin:0}}
    .container{{max-width:980px;margin:0 auto;padding:24px}}
    nav{{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:20px}}
    nav a{{text-decoration:none;color:#0D1B2A;font-weight:700}}
    nav a:hover{{color:#00A36F}}
    .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}}
    .card{{background:white;border-radius:16px;padding:18px;text-decoration:none;color:inherit;box-shadow:0 8px 25px rgba(13,27,42,.06)}}
    .card h3{{margin:0 0 8px}}
    .card p{{margin:0;color:#475569}}
    .meta{{font-size:13px;color:#64748b;margin-top:8px}}
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <a href="/">Home</a>
      <a href="/knowledge-hub/">Knowledge Hub</a>
      <a href="/blog/">Blog</a>
      <a href="/gluten-free-diet/">Gluten-free diet</a>
      <a href="/newly-diagnosed/">Newly diagnosed?</a>
    </nav>
    <h1>BiteRight Blog</h1>
    <p>Research-backed gluten and coeliac safety content.</p>
    <div class="grid">{items_html}</div>
  </div>
</body>
</html>
'''


def main():
    SRC_BLOG_DIR.mkdir(parents=True, exist_ok=True)
    posts = []
    for md_path in sorted(CONTENT_DIR.glob("*.md")):
        raw = md_path.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(raw)
        slug = slug_from_filename(md_path)
        title = fm.get("title", slug.replace("-", " ").title())
        desc = fm.get("description", "")
        date = str(fm.get("date", ""))
        hero = fm.get("image", "")

        html_body = md_to_html(body)
        out_dir = SRC_BLOG_DIR / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(post_template(title, desc, date, hero, html_body), encoding="utf-8")

        posts.append({"slug": slug, "title": title, "desc": desc, "date": date})

    cards = []
    for p in sorted(posts, key=lambda x: x["date"], reverse=True):
        cards.append(
            f'<a class="card" href="/blog/{html.escape(p["slug"])}/">'
            f'<h3>{html.escape(p["title"])}</h3>'
            f'<p>{html.escape(p["desc"][:160])}</p>'
            f'<div class="meta">{html.escape(p["date"])}</div>'
            f'</a>'
        )

    (SRC_BLOG_DIR / "index.html").write_text(index_template("\n".join(cards)), encoding="utf-8")
    print(f"Generated blog index + {len(posts)} blog pages in {SRC_BLOG_DIR}")


if __name__ == "__main__":
    main()
