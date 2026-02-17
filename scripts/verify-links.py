#!/usr/bin/env python3
"""Verify internal linking structure across programmatic SEO pages."""
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "content" / "pages"
DIST_DIR = ROOT / "dist"

def count_links_to_page(slug, all_pages):
    """Count how many other pages link to this page."""
    link_count = 0
    
    # Check if page has an HTML file
    page_html = DIST_DIR / slug / "index.html"
    if not page_html.exists():
        return 0
    
    # Count links from other pages
    for other_page in all_pages:
        if other_page['slug'] == slug:
            continue
        
        other_html = DIST_DIR / other_page['slug'] / "index.html"
        if not other_html.exists():
            continue
        
        content = other_html.read_text(encoding="utf-8")
        if f'href="/{slug}/"' in content:
            link_count += 1
    
    return link_count

def main():
    # Load all pages
    all_pages = []
    for f in sorted(PAGES_DIR.glob("*.json")):
        if "test" in f.stem:
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        all_pages.append({
            'slug': data.get('slug', f.stem),
            'title': data.get('heading', data.get('title', ''))
        })
    
    print("Internal Linking Analysis")
    print("=" * 60)
    print()
    
    # Check knowledge hub
    kb_path = ROOT / "src" / "knowledge-hub" / "index.html"
    kb_exists = kb_path.exists()
    
    print(f"Knowledge Hub: {'✓ Generated' if kb_exists else '✗ Missing'}")
    if kb_exists:
        kb_content = kb_path.read_text(encoding="utf-8")
        kb_links = sum(1 for page in all_pages if f'href="/{page["slug"]}/"' in kb_content)
        print(f"  Links to programmatic pages: {kb_links}/{len(all_pages)}")
    print()
    
    # Analyze internal links between programmatic pages
    link_distribution = defaultdict(int)
    pages_with_insufficient_links = []
    
    for page in all_pages:
        incoming_links = count_links_to_page(page['slug'], all_pages)
        # +1 for knowledge hub link
        total_links = incoming_links + (1 if kb_exists else 0)
        link_distribution[total_links] += 1
        
        if total_links < 3:
            pages_with_insufficient_links.append((page['title'], total_links))
    
    print("Internal Link Distribution (incoming links per page):")
    print("-" * 60)
    for count in sorted(link_distribution.keys(), reverse=True):
        num_pages = link_distribution[count]
        bar = "█" * min(num_pages, 50)
        print(f"  {count:2d} links: {bar} ({num_pages} pages)")
    print()
    
    # Calculate statistics
    total_pages = len(all_pages)
    well_linked = sum(count for link_count, count in link_distribution.items() if link_count >= 3)
    percentage_well_linked = (well_linked / total_pages * 100) if total_pages > 0 else 0
    
    print("Summary:")
    print("-" * 60)
    print(f"  Total programmatic pages: {total_pages}")
    print(f"  Pages with 3+ internal links: {well_linked} ({percentage_well_linked:.1f}%)")
    print(f"  Average links per page: {sum(k*v for k,v in link_distribution.items()) / total_pages:.1f}")
    print()
    
    if pages_with_insufficient_links:
        print(f"⚠ Pages with fewer than 3 internal links ({len(pages_with_insufficient_links)}):")
        for title, count in sorted(pages_with_insufficient_links, key=lambda x: x[1])[:10]:
            print(f"  - {title}: {count} links")
        if len(pages_with_insufficient_links) > 10:
            print(f"  ... and {len(pages_with_insufficient_links) - 10} more")
    else:
        print("✓ All pages have at least 3 internal links!")
    
    print()
    print("SEO Impact:")
    print("-" * 60)
    if percentage_well_linked >= 90:
        print("  ✓ EXCELLENT: Strong internal linking structure")
        print("    Pages are well-connected and should be crawled effectively")
    elif percentage_well_linked >= 70:
        print("  ✓ GOOD: Most pages have adequate internal links")
        print("    Minor improvements possible for better crawlability")
    else:
        print("  ⚠ NEEDS IMPROVEMENT: Many pages lack sufficient internal links")
        print("    Add more related content sections to improve indexation")

if __name__ == "__main__":
    main()
