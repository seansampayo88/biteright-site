const APP_STORE_URL = "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176";

// Cloudflare KV-backed counters (binding name: CLICK_COUNTERS)
const COUNTER_KEYS = {
  tt: "tt_clicks",
  app: "app_clicks",
  go: "go_clicks"
};

function withTrackingParams(baseUrl, source) {
  const url = new URL(baseUrl);
  url.searchParams.set("pt", "biteright");
  url.searchParams.set("ct", source);
  url.searchParams.set("mt", "8");
  return url.toString();
}

async function incrementCounter(kv, key) {
  if (!kv) return;
  try {
    const currentRaw = await kv.get(key);
    const current = Number.parseInt(currentRaw || "0", 10);
    const next = Number.isFinite(current) ? current + 1 : 1;
    await kv.put(key, String(next));
  } catch {
    // Non-blocking: redirect should still work even if counter write fails.
  }
}

async function getCounterValue(kv, key) {
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (raw == null) return 0;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // JSON stats endpoint for daily tracking
    if (url.pathname === "/tt-stats") {
      const kv = env.CLICK_COUNTERS;
      const [tt, app, go] = await Promise.all([
        getCounterValue(kv, COUNTER_KEYS.tt),
        getCounterValue(kv, COUNTER_KEYS.app),
        getCounterValue(kv, COUNTER_KEYS.go)
      ]);

      return new Response(
        JSON.stringify(
          {
            ok: true,
            backend: kv ? "cloudflare-kv" : "missing-kv-binding",
            counters: {
              tt_clicks: tt ?? 0,
              app_clicks: app ?? 0,
              go_clicks: go ?? 0
            },
            fetchedAt: new Date().toISOString()
          },
          null,
          2
        ),
        { headers: { "content-type": "application/json; charset=utf-8" } }
      );
    }

    // Short links for bio + social tracking
    if (url.pathname === "/app") {
      ctx?.waitUntil(incrementCounter(env.CLICK_COUNTERS, COUNTER_KEYS.app));
      return Response.redirect(withTrackingParams(APP_STORE_URL, "website_bio"), 302);
    }

    if (url.pathname === "/go") {
      ctx?.waitUntil(incrementCounter(env.CLICK_COUNTERS, COUNTER_KEYS.go));
      return Response.redirect(withTrackingParams(APP_STORE_URL, "website_bio_alias"), 302);
    }

    if (url.pathname === "/tt") {
      ctx?.waitUntil(incrementCounter(env.CLICK_COUNTERS, COUNTER_KEYS.tt));
      return Response.redirect(withTrackingParams(APP_STORE_URL, "tiktok_bio"), 302);
    }

    return env.ASSETS.fetch(request);
  }
};
