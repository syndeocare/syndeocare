import { BACKEND_CONFIG } from "@/config/backend";
import { getGatewayAuthorizationHeaders } from "@/lib/auth-backend";

type CatalogTable = "certifications" | "job_roles" | "specialties";
type CatalogKind = "certification" | "document_type" | "job_role" | "specialty";

interface CatalogRow {
  name: string | null;
  is_active: boolean | null;
  display_order?: number | null;
}

export interface AdminCatalogItem {
  id: string;
  kind: CatalogKind | "legal_page";
  name: string;
  nameAr: string | null;
  abbreviation: string | null;
  description: string | null;
  content: string | null;
  slug: string | null;
  isActive: boolean;
  isRequired: boolean;
  appliesTo: string;
  allowedExtensions: string[];
  maxSizeMb: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyCatalogItem {
  id: string;
  name: string;
  name_ar: string | null;
  abbreviation: string | null;
  description: string | null;
  is_active: boolean;
  is_required: boolean;
  applies_to: string;
  allowed_extensions: string[] | null;
  max_size_mb: number | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

type AdminCatalogPayload = {
  id?: string;
  kind: CatalogKind | "legal_page";
  name: string;
  nameAr?: string | null;
  abbreviation?: string | null;
  description?: string | null;
  content?: string | null;
  slug?: string | null;
  isActive?: boolean;
  isRequired?: boolean;
  appliesTo?: string;
  allowedExtensions?: string[];
  maxSizeMb?: number;
  displayOrder?: number;
};

const tableToKind: Record<CatalogTable, CatalogKind> = {
  certifications: "certification",
  job_roles: "job_role",
  specialties: "specialty",
};

export const DEFAULT_JOB_ROLE_OPTIONS = [
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Certified Nursing Assistant (CNA)",
  "Medical Assistant (MA)",
  "Dental Hygienist",
  "Dental Assistant",
  "Physical Therapist",
  "Occupational Therapist",
  "Radiologic Technologist",
  "Phlebotomist",
  "Medical Receptionist",
  "Other",
];

export const DEFAULT_CERTIFICATION_OPTIONS = [
  "BLS",
  "ACLS",
  "PALS",
  "NRP",
  "TNCC",
  "CEN",
  "CCRN",
  "CPR",
];

export const DEFAULT_SPECIALTY_OPTIONS = [
  "Registered Nurse (RN)",
  "Licensed Practical Nurse (LPN)",
  "Certified Nursing Assistant (CNA)",
  "Medical Assistant",
  "Phlebotomist",
  "Radiology Technician",
  "Physical Therapist",
  "Occupational Therapist",
  "Respiratory Therapist",
  "Emergency Medicine",
  "ICU/Critical Care",
  "Pediatrics",
  "Surgery",
  "General Practice",
];

const uniqueNames = (names: string[]) =>
  Array.from(
    new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
  );

export const withAllOption = (options: string[], allLabel = "All Roles") => [
  allLabel,
  ...options.filter((option) => option !== allLabel),
];

function getApiGatewayBaseUrl() {
  return BACKEND_CONFIG.apiGatewayBaseUrl;
}

async function requestGatewayJson<T>(path: string, init?: RequestInit) {
  const baseUrl = getApiGatewayBaseUrl();

  if (!baseUrl) {
    throw new Error("API gateway is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : `Catalog request failed with status ${response.status}.`,
    );
  }

  return body as T;
}

function legacyCatalogItem(item: AdminCatalogItem): LegacyCatalogItem {
  return {
    id: item.id,
    name: item.name,
    name_ar: item.nameAr,
    abbreviation: item.abbreviation,
    description: item.description,
    is_active: item.isActive,
    is_required: item.isRequired,
    applies_to: item.appliesTo,
    allowed_extensions: item.allowedExtensions,
    max_size_mb: item.maxSizeMb,
    display_order: item.displayOrder,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export async function listAdminCatalogItems(kind: CatalogKind | "legal_page") {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new Error("Please sign in again before managing configuration.");
  }

  const params = new URLSearchParams({
    includeInactive: "true",
    kind,
  });
  const response = await requestGatewayJson<{ items: AdminCatalogItem[] }>(
    `/admin/catalog?${params.toString()}`,
    { headers },
  );

  return response.items.map(legacyCatalogItem);
}

export async function saveAdminCatalogItem(payload: AdminCatalogPayload) {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new Error("Please sign in again before managing configuration.");
  }

  const item = await requestGatewayJson<AdminCatalogItem>("/admin/catalog", {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return legacyCatalogItem(item);
}

export async function deleteAdminCatalogItem(id: string) {
  const headers = getGatewayAuthorizationHeaders();

  if (!headers) {
    throw new Error("Please sign in again before managing configuration.");
  }

  await requestGatewayJson<{ deleted: boolean }>(
    `/admin/catalog/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers,
    },
  );
}

export async function fetchActiveCatalogNames(
  table: CatalogTable,
  fallback: string[],
) {
  try {
    const params = new URLSearchParams({ kind: tableToKind[table] });
    const response = await requestGatewayJson<{ items: AdminCatalogItem[] }>(
      `/catalog?${params.toString()}`,
    );

    const names = uniqueNames(
      (response.items as CatalogRow[]).map((item) => item.name ?? ""),
    );

    return names.length > 0 ? names : fallback;
  } catch (error) {
    console.warn(`Unable to load ${table} catalog`, error);
    return fallback;
  }
}

export const fetchActiveJobRoleNames = () =>
  fetchActiveCatalogNames("job_roles", DEFAULT_JOB_ROLE_OPTIONS);

export const fetchActiveCertificationNames = () =>
  fetchActiveCatalogNames("certifications", DEFAULT_CERTIFICATION_OPTIONS);

export const fetchActiveSpecialtyNames = () =>
  fetchActiveCatalogNames("specialties", DEFAULT_SPECIALTY_OPTIONS);
