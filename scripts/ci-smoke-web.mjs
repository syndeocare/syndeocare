import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:http";

const distIndex = new URL("../apps/web/dist/index.html", import.meta.url);

if (!existsSync(distIndex)) {
  console.error(
    "apps/web/dist/index.html is missing. Run pnpm build:web first.",
  );
  process.exit(1);
}

const indexHtml = readFileSync(distIndex, "utf8");
const appShellMarker = '<div id="root">';

if (
  !indexHtml.includes(appShellMarker) ||
  !indexHtml.includes("healthcare staffing in Yemen") ||
  !indexHtml.includes('lang="ar"')
) {
  console.error("The public app shell is missing bilingual crawlable content.");
  process.exit(1);
}

const publicPages = new Map([
  ["for-clinics", "Clinic Staffing in Yemen | SyndeoCare"],
  [
    "for-professionals",
    "Healthcare Jobs and Medical Shifts in Yemen | SyndeoCare",
  ],
  ["about", "About SyndeoCare | Healthcare Staffing in Yemen"],
  ["help", "SyndeoCare Help Center"],
  ["privacy", "Privacy Policy | SyndeoCare"],
  ["terms", "Terms of Service | SyndeoCare"],
]);

for (const [route, title] of publicPages) {
  const pageUrl = new URL(`../apps/web/dist/${route}`, import.meta.url);
  if (!existsSync(pageUrl)) {
    console.error(`Generated public page is missing: /${route}`);
    process.exit(1);
  }

  const pageHtml = readFileSync(pageUrl, "utf8");
  if (
    !pageHtml.includes(`<title>${title}</title>`) ||
    !pageHtml.includes(
      `<link rel="canonical" href="https://syndeocare.ai/${route}" />`,
    )
  ) {
    console.error(`Generated metadata is invalid for /${route}.`);
    process.exit(1);
  }
}

for (const file of [
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "9f4e6cb84c8f42d5933dcf8f7f77ce4a.txt",
]) {
  if (!existsSync(new URL(`../apps/web/dist/${file}`, import.meta.url))) {
    console.error(`Required public discovery file is missing: ${file}`);
    process.exit(1);
  }
}
const assetMatches = [...indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((value) => value.startsWith("/assets/"));

if (assetMatches.length === 0) {
  console.error("No built frontend assets were referenced by index.html.");
  process.exit(1);
}

for (const asset of assetMatches) {
  const assetPath = new URL(`../apps/web/dist${asset}`, import.meta.url);
  if (!existsSync(assetPath)) {
    console.error(`Referenced frontend asset is missing: ${asset}`);
    process.exit(1);
  }
}

const server = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", "4173"],
  {
    cwd: new URL("../apps/web", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
let serverExitCode = null;
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.on("exit", (code) => {
  serverExitCode = code;
});

function get(path) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port: 4173,
        path,
        method: "GET",
        timeout: 5000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error(`Timed out requesting ${path}`));
    });
    req.end();
  });
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (serverExitCode !== null) {
      break;
    }
    try {
      const response = await get("/");
      if (response.statusCode === 200) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Vite preview did not become ready.\n${serverOutput}`);
}

try {
  await waitForServer();

  for (const path of ["/", "/auth", "/admin", "/messages"]) {
    const response = await get(path);
    if (response.statusCode !== 200) {
      throw new Error(`${path} returned ${response.statusCode}`);
    }
    if (!response.body.includes(appShellMarker)) {
      throw new Error(`${path} did not return the app shell.`);
    }
  }

  for (const [route, title] of publicPages) {
    const response = await get(`/${route}`);
    if (
      response.statusCode !== 200 ||
      !response.body.includes(`<title>${title}</title>`)
    ) {
      throw new Error(`/${route} did not return its generated public page.`);
    }
  }

  console.log("Web artifact smoke test passed.");
} catch (error) {
  if (
    !process.env.CI &&
    serverExitCode !== null &&
    serverOutput.includes("listen EPERM")
  ) {
    console.warn(
      "Local sandbox blocked the preview server port; static artifact checks passed.",
    );
  } else {
    throw error;
  }
} finally {
  server.kill("SIGTERM");
}
