const APP_STORE_URL = "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176";

const GA_MEASUREMENT_ID = "G-NFPKT4GJ0P";

function withTrackingParams(baseUrl, source) {
  const url = new URL(baseUrl);
  url.searchParams.set("pt", "biteright");
  url.searchParams.set("ct", source);
  url.searchParams.set("mt", "8");
  return url.toString();
}

function trackingRedirectPage({ source, destination }) {
  const escapedDest = destination.replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="refresh" content="2;url=${escapedDest}" />
  <title>Redirecting…</title>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
    gtag('event', 'bio_link_click', {
      source: '${source}',
      destination: 'app_store'
    });
    setTimeout(function(){ window.location.href = ${JSON.stringify(destination)}; }, 350);
  </script>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#0D1B2A}a{color:#00A36F}</style>
</head>
<body>
  Redirecting to App Store…<br/>
  <a href="${escapedDest}">Tap here if not redirected</a>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Stats endpoint now points to GA4 event-based tracking (no KV dependency)
    if (url.pathname === "/tt-stats") {
      return new Response(
        JSON.stringify(
          {
            ok: true,
            backend: "ga4-event-tracking",
            note: "Use GA4 Explore/Reports for bio_link_click events (source=tiktok_bio / instagram_bio)",
            measurementId: GA_MEASUREMENT_ID,
            fetchedAt: new Date().toISOString()
          },
          null,
          2
        ),
        { headers: { "content-type": "application/json; charset=utf-8" } }
      );
    }

    // Short links for bio + social tracking via GA4 event page then redirect
    if (url.pathname === "/app") {
      const destination = withTrackingParams(APP_STORE_URL, "website_bio");
      return new Response(trackingRedirectPage({ source: "website_bio", destination }), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/go") {
      const destination = withTrackingParams(APP_STORE_URL, "instagram_bio");
      return new Response(trackingRedirectPage({ source: "instagram_bio", destination }), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
    }

    if (url.pathname === "/tt") {
      const destination = withTrackingParams(APP_STORE_URL, "tiktok_bio");
      return new Response(trackingRedirectPage({ source: "tiktok_bio", destination }), {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
