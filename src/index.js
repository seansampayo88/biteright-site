const APP_STORE_URL = "https://apps.apple.com/app/biteright-gluten-scanner/id6755896176";

function withTrackingParams(baseUrl, source) {
  const url = new URL(baseUrl);
  url.searchParams.set("pt", "biteright");
  url.searchParams.set("ct", source);
  url.searchParams.set("mt", "8");
  return url.toString();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Short links for bio + social tracking
    // /app  -> general website bio link
    // /go   -> alias
    // /tt   -> TikTok-specific link
    if (url.pathname === "/app" || url.pathname === "/go") {
      return Response.redirect(withTrackingParams(APP_STORE_URL, "website_bio"), 302);
    }

    if (url.pathname === "/tt") {
      return Response.redirect(withTrackingParams(APP_STORE_URL, "tiktok_bio"), 302);
    }

    return env.ASSETS.fetch(request);
  }
};
