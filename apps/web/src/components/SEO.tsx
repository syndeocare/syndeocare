import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://syndeocare.ai";
const SITE_NAME = "SyndeoCare.ai";

type SeoDefinition = {
  description: {
    ar: string;
    en: string;
  };
  keywords?: {
    ar: string;
    en: string;
  };
  noindex?: boolean;
  title: {
    ar: string;
    en: string;
  };
};

const defaultSeo: SeoDefinition = {
  description: {
    ar: "سنديوكير منصة توظيف صحي وربط للورديات الطبية تساعد المنشآت الصحية في اليمن على الوصول إلى مختصين صحيين موثّقين وإدارة الطلبات والحجوزات والتواصل بسهولة.",
    en: "SyndeoCare.ai connects verified healthcare professionals with clinics and medical facilities for trusted shifts, staffing, onboarding, messaging, and document verification in Yemen.",
  },
  keywords: {
    ar: "سنديوكير, سنديو كير, توظيف صحي, ورديات طبية, مختصين صحيين, منشآت صحية, تمريض, وظائف صحية, اليمن",
    en: "SyndeoCare, SyndeoCare.ai, healthcare staffing Yemen, medical shifts, clinic staffing, nurse staffing, verified healthcare professionals, healthcare jobs Yemen",
  },
  title: {
    ar: "SyndeoCare.ai | منصة التوظيف الصحي والورديات الطبية في اليمن",
    en: "SyndeoCare.ai | Healthcare Staffing, Medical Shifts & Clinic Staffing in Yemen",
  },
};

const routeSeo: Record<string, SeoDefinition> = {
  "/": defaultSeo,
  "/about": {
    description: {
      ar: "تعرّف على SyndeoCare ورؤيتنا في جعل التوظيف الصحي والورديات الطبية أكثر موثوقية وسهولة للمنشآت الصحية والمختصين الصحيين.",
      en: "Learn about SyndeoCare and our mission to make healthcare staffing, medical shifts, and verified professional matching simpler and more trusted.",
    },
    title: {
      ar: "من نحن | SyndeoCare.ai",
      en: "About SyndeoCare.ai | Trusted Healthcare Staffing",
    },
  },
  "/for-clinics": {
    description: {
      ar: "انشر ورديات منشأتك الصحية، راجع المختصين الموثّقين، أدِر الطلبات والحجوزات، وتواصل بأمان عبر SyndeoCare.",
      en: "Post clinic shifts, review verified healthcare professionals, manage applicants and bookings, and coordinate staffing securely with SyndeoCare.",
    },
    keywords: {
      ar: "توظيف منشآت صحية, تغطية ورديات, مختصين موثقين, توظيف تمريض, سنديوكير للمنشآت",
      en: "clinic staffing, healthcare facility staffing, post medical shifts, verified nurses, medical staffing platform",
    },
    title: {
      ar: "SyndeoCare للمنشآت الصحية | انشر وردياتك وتواصل مع مختصين موثّقين",
      en: "SyndeoCare for Clinics | Post Shifts & Hire Verified Healthcare Professionals",
    },
  },
  "/for-professionals": {
    description: {
      ar: "أنشئ ملفك المهني، وثّق مستنداتك، واعثر على ورديات طبية مناسبة بالقرب منك عبر SyndeoCare.",
      en: "Create a verified healthcare profile, upload documents, find nearby medical shifts, and apply for flexible healthcare work through SyndeoCare.",
    },
    keywords: {
      ar: "وظائف صحية, ورديات تمريض, مختص صحي, ورديات طبية, سنديوكير للمختصين",
      en: "healthcare jobs Yemen, nursing shifts, medical shifts, healthcare professional profile, flexible healthcare work",
    },
    title: {
      ar: "SyndeoCare للمختصين الصحيين | ابحث عن ورديات طبية موثوقة",
      en: "SyndeoCare for Healthcare Professionals | Find Verified Medical Shifts",
    },
  },
  "/help": {
    description: {
      ar: "مركز مساعدة SyndeoCare للمنشآت الصحية والمختصين الصحيين.",
      en: "SyndeoCare help center for clinics, healthcare facilities, and healthcare professionals.",
    },
    title: {
      ar: "المساعدة | SyndeoCare.ai",
      en: "Help | SyndeoCare.ai",
    },
  },
  "/privacy": {
    description: {
      ar: "سياسة خصوصية SyndeoCare وكيف نتعامل مع بيانات الحسابات والملفات والمستندات.",
      en: "SyndeoCare privacy policy for account, profile, document, and platform data.",
    },
    title: {
      ar: "سياسة الخصوصية | SyndeoCare.ai",
      en: "Privacy Policy | SyndeoCare.ai",
    },
  },
  "/terms": {
    description: {
      ar: "شروط استخدام SyndeoCare للمنشآت الصحية والمختصين الصحيين.",
      en: "SyndeoCare terms of service for clinics, healthcare facilities, and healthcare professionals.",
    },
    title: {
      ar: "شروط الخدمة | SyndeoCare.ai",
      en: "Terms of Service | SyndeoCare.ai",
    },
  },
};

const noIndexPrefixes = [
  "/admin",
  "/auth",
  "/dashboard",
  "/design-system",
  "/login",
  "/logout",
  "/messages",
  "/onboarding",
  "/profile",
  "/professional",
  "/clinic",
  "/reset-password",
  "/search",
  "/settings",
  "/shifts",
  "/signup",
  "/verify",
];

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = url;
}

function getSeoForPath(pathname: string): SeoDefinition {
  if (routeSeo[pathname]) return routeSeo[pathname];
  if (pathname.startsWith("/legal/")) return routeSeo["/help"];
  if (noIndexPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return { ...defaultSeo, noindex: true };
  }
  return { ...defaultSeo, noindex: true };
}

export function SEO() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith("ar") ? "ar" : "en";

  const seo = useMemo(
    () => getSeoForPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    const title = seo.title[language];
    const description = seo.description[language];
    const keywords =
      seo.keywords?.[language] ?? defaultSeo.keywords?.[language] ?? "";
    const canonical = `${SITE_URL}${location.pathname === "/" ? "/" : location.pathname}`;
    const robots = seo.noindex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = title;

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", language === "ar" ? "ar_YE" : "en_US");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertCanonical(canonical);
  }, [language, location.pathname, seo]);

  return null;
}
