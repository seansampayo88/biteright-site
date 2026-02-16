#!/usr/bin/env python3
"""Refresh specific pages with OpenAI-derived ingredient analysis. Run with OPENAI_API_KEY set."""
import json
import os
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "content" / "pages"

REFRESH_SLUGS = [
    "is-granola-gluten-free",
    "are-tortilla-chips-gluten-free",
    "are-flour-tortillas-gluten-free",
    "are-corn-tortillas-gluten-free",
    "are-bagels-gluten-free",
    "are-pretzels-gluten-free",
    "is-beer-gluten-free",
    "is-licorice-gluten-free",
    "is-soy-milk-gluten-free",
    "is-seitan-gluten-free",
    "is-tempeh-gluten-free",
    "is-couscous-gluten-free",
    "is-bulgur-gluten-free",
    "is-imitation-crab-gluten-free",
    "is-gravy-gluten-free",
    "is-stuffing-gluten-free",
    "is-matzo-gluten-free",
    "is-tzatziki-gluten-free",
    "is-hummus-gluten-free",
    "is-gyoza-gluten-free",
]


def title_case(s):
    return " ".join(w.capitalize() for w in s.split())


def topic_from_page(page):
    if page.get("topic_key"):
        return title_case(page["topic_key"].replace("-", " "))
    slug = page.get("slug", "").replace("is-", "").replace("are-", "").replace("-gluten-free", "")
    return title_case(slug.replace("-", " "))


def fetch_profile_from_openai(topic_name, api_key):
    prompt = f'''You are a gluten safety expert for people with coeliac disease. Analyze "{topic_name}" for gluten risks.

Return a JSON object with exactly these keys (no extra fields):
- verdict: "safe" | "caution" | "unsafe" — overall gluten risk
- summary: 1–2 sentence explanation of the main gluten risks or why it's safe
- risk: array of 3–5 specific ingredients or prep methods in "{topic_name}" that commonly contain gluten (e.g. for soy sauce: "Wheat", "Barley"; for bagels: "Wheat flour", "Malt")
- safe: array of 3–5 specific ingredients, brands, or prep methods for "{topic_name}" that are typically gluten-free (e.g. for soy sauce: "Tamari (labeled GF)", "Coconut aminos"; for bagels: "GF-certified bagels", "Separate toaster"). Do NOT use generic items like "Plain rice" or "Fresh vegetables" — be specific to this food.
- alternatives: array of 3–5 gluten-free alternatives diners could order instead
- waiter: one short question a diner could ask the kitchen to confirm gluten safety

Be specific to "{topic_name}" for both risk and safe. No generic lists.'''

    body = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60) as res:
        data = json.loads(res.read().decode())

    text = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not text:
        return None

    parsed = json.loads(text)
    if not all(k in parsed for k in ("risk", "safe", "alternatives", "waiter", "summary")):
        return None
    if not all(isinstance(parsed[k], list) for k in ("risk", "safe", "alternatives")):
        return None

    verdict = str(parsed.get("verdict", "caution")).lower()
    if verdict not in ("safe", "caution", "unsafe"):
        verdict = "caution"

    return {
        "verdict": verdict,
        "summary": parsed["summary"],
        "risk": [x for x in parsed["risk"][:6] if x],
        "safe": [x for x in parsed["safe"][:6] if x],
        "alternatives": [x for x in parsed["alternatives"][:6] if x],
        "waiter": parsed["waiter"],
    }


def is_plural(slug):
    return slug.startswith("are-")


def apply_profile(page, profile, topic_name):
    plural = is_plural(page.get("slug", ""))
    summary = profile["summary"]
    if plural:
        summary = re.sub(r"^This (item|dish|sauce) ", "These items ", summary, flags=re.I)

    page["verdict"] = {"status": profile["verdict"], "summary": summary}
    page["ingredients"] = {"risk": profile["risk"], "safe": profile["safe"]}
    page["waiter_script"] = {"preview": profile["waiter"]}
    page["safe_alternatives"] = profile["alternatives"]
    page["meta"] = page.get("meta", {})
    page["meta"]["updated_at"] = __import__("datetime").datetime.now().strftime("%Y-%m-%d")
    return page


def load_env():
    """Load .env from project root if present."""
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    load_env()
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is required.")
        print("Run: OPENAI_API_KEY=sk-your-key python3 scripts/refresh-pages-py.py")
        exit(1)

    for slug in REFRESH_SLUGS:
        path = PAGES_DIR / f"{slug}.json"
        if not path.exists():
            print(f"Skip {slug} (file not found)")
            continue

        page = json.loads(path.read_text(encoding="utf-8"))
        topic_name = topic_from_page(page)

        try:
            profile = fetch_profile_from_openai(topic_name, api_key)
        except Exception as e:
            print(f"Error {slug}: {e}")
            continue

        if not profile:
            print(f"Skip {slug} (OpenAI returned invalid response)")
            continue

        page = apply_profile(page, profile, topic_name)
        path.write_text(json.dumps(page, indent=2) + "\n", encoding="utf-8")
        print(f"Refreshed {slug}")

    print("Done.")


if __name__ == "__main__":
    main()
