const APP_STORE_URL = "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176";

// Free no-cloud counter backend (public API)
const COUNTER_NS = "biterightgluten.com";
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

async function incrementCounter(key) {
  const endpoint = `https://api.countapi.xyz/hit/${encodeURIComponent(COUNTER_NS)}/${encodeURIComponent(key)}`;
  try {
    await fetch(endpoint, { method: "GET" });
  } catch {
    // Non-blocking: redirect should still work even if counter API fails.
  }
}

async function getCounterValue(key) {
  const endpoint = `https://api.countapi.xyz/get/${encodeURIComponent(COUNTER_NS)}/${encodeURIComponent(key)}`;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // JSON stats endpoint for daily tracking
    if (url.pathname === "/tt-stats") {
      const [tt, app, go] = await Promise.all([
        getCounterValue(COUNTER_KEYS.tt),
        getCounterValue(COUNTER_KEYS.app),
        getCounterValue(COUNTER_KEYS.go)
      ]);

      return new Response(
        JSON.stringify(
          {
            ok: true,
            namespace: COUNTER_NS,
            counters: {
              // Return numeric 0 when a key has never been hit yet
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
      ctx?.waitUntil(incrementCounter(COUNTER_KEYS.app));
      return Response.redirect(withTrackingParams(APP_STORE_URL, "website_bio"), 302);
    }

    if (url.pathname === "/go") {
      ctx?.waitUntil(incrementCounter(COUNTER_KEYS.go));
      return Response.redirect(withTrackingParams(APP_STORE_URL, "website_bio_alias"), 302);
    }

    if (url.pathname === "/tt") {
      ctx?.waitUntil(incrementCounter(COUNTER_KEYS.tt));
      return Response.redirect(withTrackingParams(APP_STORE_URL, "tiktok_bio"), 302);
    }

    return env.ASSETS.fetch(request);
  }
};
