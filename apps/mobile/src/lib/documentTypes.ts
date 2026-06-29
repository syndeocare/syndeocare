import type { CatalogItem } from "../types";

type DocumentTypeLike = Pick<
  CatalogItem,
  "appliesTo" | "id" | "isActive" | "isRequired" | "name" | "nameAr"
>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const GATEWAY_DOCUMENT_TYPE_KEYS: Record<string, string> = {
  business_license: "business_license",
  certification: "certifications",
  certifications: "certifications",
  commercial_registration: "trade_license",
  facility_accreditation: "facility_accreditation",
  government_id: "government_id",
  identity_card: "government_id",
  insurance: "insurance",
  license: "license",
  national_id: "government_id",
  professional_license: "license",
  trade_license: "trade_license",
};

export const normalizeDocumentType = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const getGatewayDocumentTypeKey = (docType: DocumentTypeLike) => {
  const normalizedId = normalizeDocumentType(docType.id);

  if (docType.id && !UUID_PATTERN.test(docType.id)) {
    return GATEWAY_DOCUMENT_TYPE_KEYS[normalizedId] ?? normalizedId;
  }

  const normalizedName = normalizeDocumentType(docType.name);
  return GATEWAY_DOCUMENT_TYPE_KEYS[normalizedName] ?? normalizedName;
};

export const documentTypeMatches = (
  uploadedDocumentType: string,
  docType: DocumentTypeLike,
) => {
  const uploaded = normalizeDocumentType(uploadedDocumentType);
  const accepted = [
    getGatewayDocumentTypeKey(docType),
    docType.id,
    docType.name,
    docType.nameAr ?? "",
  ]
    .filter(Boolean)
    .map(normalizeDocumentType);

  return accepted.includes(uploaded);
};

export const filterDocumentTypesForRole = (
  items: CatalogItem[] | undefined,
  role: "clinic" | "professional",
) =>
  (items ?? [])
    .filter(
      (item) =>
        item.isActive && (item.appliesTo === role || item.appliesTo === "both"),
    )
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
