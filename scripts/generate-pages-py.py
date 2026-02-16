#!/usr/bin/env python3
"""Port of generate-pages.mjs for environments without Node."""
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEEDS_PATH = ROOT / "content" / "seeds" / "topics.txt"
OUT_DIR = ROOT / "content" / "pages"
MAX_NEW = int(os.environ.get("MAX_NEW_PAGES", "10"))


def slugify(topic):
    s = topic.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"(^-|-$)+", "", s)
    return s


def is_topic_plural(topic_key):
    k = topic_key.lower()
    plural_endings = [
        "noodles", "waffles", "pancakes", "croissants", "breadcrumbs", "wrappers",
        "browns", "nuggets", "meatballs", "sausages", "chips", "eggs", "oats",
    ]
    if any(k == e or k.endswith("-" + e) for e in plural_endings):
        return True
    plural_exact = {
        "fish-and-chips", "bacon-and-eggs", "scrambled-eggs", "overnight-oats",
        "hash-browns", "chicken-nuggets", "spring-roll-wrappers", "dumpling-wrappers",
        "panko-breadcrumbs", "tortilla-chips", "flour-tortillas", "corn-tortillas",
        "egg-rolls", "bagels", "pretzels",
    }
    return topic_key in plural_exact


def title_case(topic):
    return " ".join(w.capitalize() for w in topic.split())


def profile_for_topic(topic_lower):
    if "soy sauce" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "Traditional soy sauce is usually high risk because it is commonly brewed with wheat.",
            "risk": ["Wheat", "Barley", "Hydrolyzed wheat protein"],
            "safe": ["Tamari (labeled GF)", "Coconut aminos"],
            "alternatives": ["Tamari", "Coconut aminos", "Salt + citrus"],
            "waiter": "Is this made with wheat-based soy sauce or gluten-free tamari?",
        }
    if "miso" in topic_lower or "ramen" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "This dish is often high risk due to broth bases and fermented ingredients that may include barley or wheat.",
            "risk": ["Barley koji", "Wheat soy sauce", "Seasoning packets"],
            "safe": ["Plain tofu", "Wakame", "Rice noodles (if separate pot)"],
            "alternatives": ["Clear broth", "Steamed rice", "Sashimi (no sauce)"],
            "waiter": "Is the broth or paste made with barley, wheat, or regular soy sauce?",
        }
    if any(x in topic_lower for x in ["gochujang", "teriyaki", "oyster", "worcestershire"]):
        return {
            "verdict": "unsafe",
            "summary": "This sauce is frequently high risk because many recipes include wheat-based thickeners or soy sauce.",
            "risk": ["Wheat flour", "Regular soy sauce", "Malt vinegar"],
            "safe": ["Certified GF version", "Homemade alternate sauce"],
            "alternatives": ["Salt + sesame oil", "GF tamari blend", "Fresh herb dressing"],
            "waiter": "Is this sauce made with wheat flour, regular soy sauce, or malt vinegar?",
        }
    if any(x in topic_lower for x in ["kimchi", "fish sauce", "rice vinegar"]):
        return {
            "verdict": "caution",
            "summary": "This can be gluten-free, but ingredient brands and prep methods vary by kitchen and region.",
            "risk": ["Added soy sauce", "Flavoring blends", "Cross-contact prep"],
            "safe": ["Simple fermentation ingredients", "Rice vinegar", "Plain fish extract"],
            "alternatives": ["Plain pickled vegetables", "Steamed sides", "Fresh salad"],
            "waiter": "Can you confirm there is no wheat, barley, rye, or regular soy sauce in this?",
        }
    if "beer" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "Traditional beer is made from barley and is not gluten-free.",
            "risk": ["Barley malt", "Wheat", "Rye"],
            "safe": ["Gluten-free beer", "Cider", "Wine"],
            "alternatives": ["GF beer", "Hard cider", "Wine", "Spirits"],
            "waiter": "Do you have gluten-free beer or cider?",
        }
    if "seitan" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "Seitan is made from wheat gluten and is not gluten-free.",
            "risk": ["Wheat gluten"],
            "safe": ["Tofu", "Tempeh", "Legumes"],
            "alternatives": ["Tofu", "Tempeh", "Jackfruit", "Mushrooms"],
            "waiter": "Is there seitan or wheat gluten in this dish?",
        }
    if "couscous" in topic_lower or "bulgur" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "This grain is made from wheat and is not gluten-free.",
            "risk": ["Wheat"],
            "safe": ["Quinoa", "Rice", "Millet"],
            "alternatives": ["Quinoa", "Rice", "Cauliflower rice"],
            "waiter": "Can this be made with rice or quinoa instead?",
        }
    if "imitation crab" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "Imitation crab often contains wheat starch as a binder.",
            "risk": ["Wheat starch", "Wheat flour"],
            "safe": ["Real crab", "Shrimp", "Certified GF surimi"],
            "alternatives": ["Real crab", "Shrimp", "Tuna"],
            "waiter": "Is the imitation crab made with wheat? Do you have real crab?",
        }
    if "gravy" in topic_lower or "stuffing" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "This is typically made with wheat flour or bread.",
            "risk": ["Wheat flour", "Bread", "Roux"],
            "safe": ["GF gravy", "Pan juices", "GF stuffing"],
            "alternatives": ["Pan juices", "GF gravy", "Skip the stuffing"],
            "waiter": "Is the gravy/stuffing made with wheat flour? Do you have GF options?",
        }
    if "matzo" in topic_lower:
        return {
            "verdict": "unsafe",
            "summary": "Matzo is made from wheat flour and is not gluten-free.",
            "risk": ["Wheat flour"],
            "safe": ["GF matzo", "Rice cakes"],
            "alternatives": ["GF matzo", "Rice cakes", "Potato starch crackers"],
            "waiter": "Do you have gluten-free matzo?",
        }
    if "licorice" in topic_lower:
        return {
            "verdict": "caution",
            "summary": "Some licorice contains wheat flour as a binder.",
            "risk": ["Wheat flour", "Wheat starch"],
            "safe": ["Certified GF licorice", "Fruit chews"],
            "alternatives": ["GF licorice", "Gummy candy", "Dark chocolate"],
            "waiter": "Check the ingredient label for wheat flour.",
        }
    return {
        "verdict": "caution",
        "summary": "This item may be gluten-free in some kitchens, but ingredients and preparation can still introduce risk.",
        "risk": ["Soy sauce", "Malt flavoring", "Shared fryer oil"],
        "safe": ["Plain rice", "Fresh vegetables"],
        "alternatives": ["Steamed rice", "Plain salad", "Grilled protein without sauce"],
        "waiter": "Can you confirm this has no wheat, barley, rye, regular soy sauce, or shared fryer contamination?",
    }


def build_page(topic_name):
    topic_key = slugify(topic_name)
    plural = is_topic_plural(topic_key)
    verb = "are" if plural else "is"
    verb_cap = "Are" if plural else "Is"
    slug = f"{verb}-{topic_key}-gluten-free"
    title_topic = title_case(topic_name)
    profile = profile_for_topic(topic_name.lower())
    summary = profile["summary"]
    if plural:
        summary = re.sub(r"^This (item|dish|sauce) ", "These items ", summary, flags=re.I)

    return {
        "schema_version": 1,
        "topic_key": topic_key,
        "slug": slug,
        "title": f"{verb_cap} {title_topic} Gluten Free? | BiteRight",
        "description": f"Public gluten safety analysis for {title_topic}. See major risks, safer alternatives, and what to ask before ordering.",
        "heading": f"{verb_cap} {title_topic} gluten free?",
        "intro": f"This public analysis report explains the biggest gluten risks in {title_topic} and how to order more safely.",
        "verdict": {"status": profile["verdict"], "summary": summary},
        "disclaimer": "This guidance is informational only. Always verify ingredients and preparation with the restaurant.",
        "meta": {"updated_at": __import__("datetime").datetime.now().strftime("%Y-%m-%d")},
        "sections": [
            {"title": "Quick answer", "body": f"{title_topic} can vary by recipe, ingredients, and cross-contact controls in the kitchen."},
            {"title": "Common gluten risks", "body": "Watch for hidden sources like soy sauce, malt flavoring, marinades, thickeners, and shared fryers."},
            {"title": "How BiteRight helps", "body": "Scan menus and ingredient labels with BiteRight to get a localized gluten-risk breakdown in seconds."},
        ],
        "ingredients": {"risk": profile["risk"], "safe": profile["safe"]},
        "waiter_script": {"preview": profile["waiter"]},
        "safe_alternatives": profile["alternatives"],
        "faq": [
            {"question": f"Can BiteRight confirm if {title_topic} {verb} gluten free?", "answer": "BiteRight highlights likely gluten risks based on ingredients and preparation. Always confirm with the kitchen if you have coeliac disease."},
            {"question": "What should I ask a restaurant?", "answer": "Ask about shared equipment, sauces, marinades, and whether the kitchen has a dedicated gluten-free prep area."},
        ],
        "cta": {
            "title": "Want to scan menus in seconds?",
            "body": "Download BiteRight to check ingredients and menu items on the go.",
            "href": "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176",
            "label": "Download on the App Store",
        },
    }


def main():
    topics = [line.strip() for line in SEEDS_PATH.read_text().splitlines() if line.strip()]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    existing = {f.replace(".json", "") for f in os.listdir(OUT_DIR) if f.endswith(".json")}
    created = 0
    for topic in topics:
        if created >= MAX_NEW:
            break
        topic_key = slugify(topic)
        if topic_key == "test":
            continue
        page = build_page(topic)
        slug = page["slug"]
        if slug in existing:
            continue
        out_path = OUT_DIR / f"{slug}.json"
        out_path.write_text(json.dumps(page, indent=2) + "\n", encoding="utf-8")
        created += 1
        print(f"Created {slug}.json")
    print(f"Done. Created {created} new pages.")


if __name__ == "__main__":
    main()
