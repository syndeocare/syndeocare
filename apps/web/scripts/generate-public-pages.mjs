import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const baseHtml = await readFile(path.join(distDir, "index.html"), "utf8");

const pages = [
  {
    route: "for-clinics",
    title: "Clinic Staffing in Yemen | SyndeoCare",
    description:
      "Post medical shifts, review verified healthcare professionals, manage applicants and bookings, and coordinate clinic staffing in Yemen with SyndeoCare.",
    heading: "Healthcare staffing for clinics in Yemen",
    copy: "Publish medical shifts, find verified professionals, manage applications, and coordinate every booking from one trusted platform.",
    arabic:
      "انشر ورديات منشأتك الصحية في اليمن، وراجع المختصين الموثقين، وأدر الطلبات والحجوزات والتواصل بسهولة.",
  },
  {
    route: "for-professionals",
    title: "Healthcare Jobs and Medical Shifts in Yemen | SyndeoCare",
    description:
      "Create a verified healthcare profile, find nursing and medical shifts in Yemen, and apply for trusted healthcare jobs through SyndeoCare.",
    heading: "Healthcare jobs and medical shifts in Yemen",
    copy: "Build a verified professional profile, discover suitable nearby shifts, apply securely, and manage your bookings in one place.",
    arabic:
      "أنشئ ملفك المهني الموثق، واعثر على وظائف صحية وورديات تمريض وطب مناسبة في اليمن، وقدّم عليها بسهولة.",
  },
  {
    route: "about",
    title: "About SyndeoCare | Healthcare Staffing in Yemen",
    description:
      "Learn how SyndeoCare makes healthcare staffing, medical shifts, and verified professional matching simpler and more trusted in Yemen.",
    heading: "About SyndeoCare",
    copy: "SyndeoCare helps healthcare facilities and professionals coordinate trusted staffing with clear verification, applications, bookings, and communication.",
    arabic:
      "تساعد سنديوكير المنشآت والمختصين الصحيين في اليمن على إدارة التوظيف والورديات والتوثيق والحجوزات والتواصل بثقة.",
  },
  {
    route: "help",
    title: "SyndeoCare Help Center",
    description:
      "Get help using SyndeoCare for healthcare staffing, profiles, verification, shifts, applications, bookings, and messaging.",
    heading: "SyndeoCare help center",
    copy: "Find support for accounts, verification, healthcare profiles, shifts, applications, bookings, and secure messaging.",
    arabic:
      "احصل على المساعدة في الحسابات والتوثيق والملفات المهنية والورديات والطلبات والحجوزات والرسائل.",
  },
  {
    route: "privacy",
    title: "Privacy Policy | SyndeoCare",
    description:
      "Read the SyndeoCare privacy policy for account, profile, verification document, booking, and platform data.",
    heading: "SyndeoCare privacy policy",
    copy: "Learn how SyndeoCare handles account, profile, verification document, booking, and communication data.",
    arabic:
      "تعرّف على كيفية تعامل سنديوكير مع بيانات الحساب والملف والتوثيق والحجوزات والتواصل.",
  },
  {
    route: "terms",
    title: "Terms of Service | SyndeoCare",
    description:
      "Read the SyndeoCare terms of service for healthcare professionals, clinics, and medical facilities.",
    heading: "SyndeoCare terms of service",
    copy: "Review the terms that govern use of SyndeoCare by healthcare professionals, clinics, and medical facilities.",
    arabic:
      "راجع شروط استخدام سنديوكير للمختصين الصحيين والمنشآت والعيادات والمرافق الطبية.",
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function replaceMeta(html, selector, value) {
  const expression = new RegExp(
    `(<meta\\s+${selector}=["'][^"']+["']\\s+content=["'])[^"']*(["'])`,
    "i",
  );
  return html.replace(expression, `$1${escapeHtml(value)}$2`);
}

for (const page of pages) {
  const canonical = `https://syndeocare.ai/${page.route}`;
  const shell = `<main><article><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.copy)}</p><p lang="ar" dir="rtl">${escapeHtml(page.arabic)}</p><nav aria-label="Public pages"><a href="/">SyndeoCare home</a><a href="/for-professionals">For professionals</a><a href="/for-clinics">For clinics</a></nav></article></main>`;

  let html = baseHtml
    .replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(page.title)}</title>`,
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/i,
      `<link rel="canonical" href="${canonical}" />`,
    )
    .replace(
      /<div id="root">[\s\S]*?<\/div>\s*<script type="module"/i,
      `<div id="root">${shell}</div><script type="module"`,
    );

  html = replaceMeta(html, 'name="description"', page.description);
  html = replaceMeta(html, 'property="og:title"', page.title);
  html = replaceMeta(html, 'property="og:description"', page.description);
  html = replaceMeta(html, 'property="og:url"', canonical);
  html = replaceMeta(html, 'name="twitter:title"', page.title);
  html = replaceMeta(html, 'name="twitter:description"', page.description);

  await writeFile(path.join(distDir, page.route), html);
}

await writeFile(
  path.join(distDir, "public-routes.txt"),
  `${pages.map((page) => page.route).join("\n")}\n`,
);
