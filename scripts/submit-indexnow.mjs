const key = "9f4e6cb84c8f42d5933dcf8f7f77ce4a";
const siteUrl = (
  process.env.INDEXNOW_SITE_URL || "https://syndeocare.ai"
).replace(/\/$/, "");
const routes = [
  "",
  "/for-clinics",
  "/for-professionals",
  "/about",
  "/help",
  "/privacy",
  "/terms",
];

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList: routes.map((route) => `${siteUrl}${route || "/"}`),
  }),
});

if (!response.ok && response.status !== 202) {
  throw new Error(`IndexNow submission failed with HTTP ${response.status}.`);
}

console.log(`Submitted ${routes.length} public URLs to IndexNow.`);
