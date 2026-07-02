import { BACKEND_CONFIG } from "@/config/backend";
import {
  getGatewayAuthorizationHeaders,
  type AuthUser,
} from "@/lib/auth-backend";

export type AppUserRole =
  | "professional"
  | "clinic"
  | "admin"
  | "super_admin"
  | null;
export type LegacyVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "not_started"
  | "pending_review"
  | "approved"
  | null;

export interface BackendActorBridge {
  user: AuthUser;
  userRole: Exclude<AppUserRole, "super_admin" | null>;
  profileId?: string | null;
  clinicId?: string | null;
  verificationStatus?: LegacyVerificationStatus;
  onboardingCompleted?: boolean;
  displayName?: string | null;
}

type PlatformVerificationStatus =
  | "not_started"
  | "pending_review"
  | "approved"
  | "rejected";

type PlatformProfessionalSummary = {
  id: string;
  fullName: string;
  specialty: string;
  headline?: string;
  bio?: string;
  licenseNumber?: string;
  primaryPhone?: string;
  yearsExperience: number;
  languages: string[];
  rating: number;
  verificationStatus: PlatformVerificationStatus;
  onboardingCompleted: boolean;
  profileImageUrl?: string;
  city: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  availability: {
    status: "available" | "limited" | "unavailable";
    nextAvailableAt?: string;
    locationRadiusKm: number;
  };
};

type PlatformClinicSummary = {
  id: string;
  organizationName: string;
  facilityType: string;
  description?: string;
  contactPhone?: string;
  websiteUrl?: string;
  services: string[];
  city: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  verificationStatus: PlatformVerificationStatus;
  onboardingCompleted: boolean;
  logoUrl?: string;
  openRoles: number;
  rating: number;
};

type PlatformJob = {
  id: string;
  title: string;
  specialty: string;
  employmentType: "temporary_shift" | "permanent_role" | "contract";
  status: "open" | "filled" | "closed";
  clinicId: string;
  clinicName: string;
  location: {
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    radiusKm?: number;
  };
  startsAt: string;
  endsAt?: string;
  compensation: {
    amount: number;
    currency: string;
    unit: "hour" | "day" | "shift" | "contract";
  };
  verificationRequired: boolean;
  summary: string;
  description?: string;
  requirements?: string[];
  languages: string[];
};

const REDACTED_CLINIC_ID = "redacted-clinic";
const REDACTED_CLINIC_NAME = "Verified Healthcare Facility";

type PlatformBooking = {
  id: string;
  jobId: string;
  jobTitle: string;
  status: "requested" | "accepted" | "confirmed" | "completed" | "cancelled";
  clinicId: string;
  clinicName: string;
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt?: string;
  location: {
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    radiusKm?: number;
  };
  compensation: {
    amount: number;
    currency: string;
    unit: "hour" | "day" | "shift" | "contract";
  };
  requestedAt?: string;
  lastUpdatedAt?: string;
  notes?: string;
};

type PlatformActor = {
  sub: string;
  email?: string;
  role: "professional" | "clinic" | "admin";
  permissions: string[];
  clinicId?: string;
  profileId?: string;
  onboardingCompleted: boolean;
  verificationStatus: PlatformVerificationStatus;
  displayName?: string;
};

export type PlatformConversationSummary = {
  id: string;
  kind: "admin" | "standard";
  displayName: string;
  counterpartRole: "admin" | "clinic" | "professional";
  lastMessageAt: string;
};

export type PlatformConversationMessage = {
  id: string;
  conversationId: string;
  senderActorId: string;
  senderRole: "admin" | "clinic" | "professional";
  content: string;
  isRead: boolean;
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
};

export type LegacyProfessional = {
  id: string;
  user_id?: string;
  full_name: string;
  email?: string;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  qualifications: string[] | null;
  hourly_rate: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_status: "pending" | "verified" | "rejected";
  is_available: boolean | null;
  location_address: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  phone?: string | null;
  onboarding_completed?: boolean;
};

export type LegacyClinic = {
  id: string;
  name: string;
  email?: string;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  verification_status: "pending" | "verified" | "rejected";
  onboarding_completed?: boolean;
  location_lat?: number | null;
  location_lng?: number | null;
  tax_id?: string | null;
  settings?: {
    website?: string | null;
  } | null;
};

type ProfessionalProfileUpdateDraft = {
  fullName: string;
  bio?: string | null;
  primaryPhone?: string | null;
  specialties: string[];
  qualifications: string[];
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

type ClinicProfileUpdateDraft = {
  organizationName: string;
  description?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

export type LegacyShift = {
  id: string;
  source?: "platform" | "legacy";
  currency?: string;
  title: string;
  role_required: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  location_address: string | null;
  description: string | null;
  required_certifications: string[] | null;
  is_urgent: boolean;
  is_filled?: boolean;
  clinic: {
    id: string;
    name: string;
    address: string | null;
    rating_avg: number | null;
    logo_url?: string | null;
  };
};

export type LegacyBooking = {
  id: string;
  status: string;
  notes?: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  professional_id: string;
  professional_name?: string;
  clinic_id: string;
  shift: {
    id: string;
    title: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    location_address: string | null;
    clinic: {
      id: string;
      name: string;
    };
  };
};

export type LegacyShiftCreateDraft = {
  title?: string | null;
  role_required: string;
  description?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  location_address?: string | null;
  required_certifications?: string[] | null;
  is_urgent?: boolean;
};

export type GatewayOnboardingStatus = {
  role: "professional" | "clinic" | "admin";
  onboardingCompleted: boolean;
  verificationStatus: PlatformVerificationStatus;
  requiredDocuments: string[];
  missingDocuments: string[];
  uploadedDocuments: Array<{
    id: string;
    type: string;
    status: "pending_review" | "approved" | "rejected";
    uploadedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
  }>;
  nextAction: string;
  submittedAt?: string;
  reviewedAt?: string;
};

export class BackendRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const platformApiBaseUrl = BACKEND_CONFIG.platformApiBaseUrl;
const apiGatewayBaseUrl = BACKEND_CONFIG.apiGatewayBaseUrl;

export function isPlatformBackendConfigured() {
  return Boolean(platformApiBaseUrl);
}

export function isGatewayBackendConfigured() {
  return Boolean(apiGatewayBaseUrl);
}

export function canUsePlatformProtectedRoutes(
  bridge?: BackendActorBridge | null,
) {
  return Boolean(
    apiGatewayBaseUrl && bridge?.user && bridge.userRole !== "super_admin",
  );
}

function mapVerificationStatus(
  status?: PlatformVerificationStatus | LegacyVerificationStatus,
): "pending" | "verified" | "rejected" {
  switch (status) {
    case "approved":
    case "verified":
      return "verified";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
}

function mapVerificationStatusToGateway(status?: LegacyVerificationStatus) {
  switch (status) {
    case "approved":
    case "verified":
      return "approved";
    case "rejected":
      return "rejected";
    case "not_started":
      return "not_started";
    case "pending_review":
    default:
      return "pending_review";
  }
}

export function isVerifiedStatus(status?: string | null) {
  return (
    mapVerificationStatus(
      status as PlatformVerificationStatus | LegacyVerificationStatus,
    ) === "verified"
  );
}

function buildLocationAddress(city?: string, region?: string) {
  return [city, region].filter(Boolean).join(", ") || null;
}

function toDateParts(iso: string) {
  const [datePart, timePart = "00:00:00"] = iso.split("T");
  return {
    shiftDate: datePart,
    time: timePart.slice(0, 5),
  };
}

function toHourlyRate(compensation: PlatformJob["compensation"]) {
  return compensation.unit === "hour"
    ? compensation.amount
    : compensation.amount;
}

function buildLocalDateTimeIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (Number.isNaN(value.getTime())) {
    throw new BackendRequestError(
      "A valid shift date and time are required.",
      400,
    );
  }

  return value;
}

function requestHeaders(headers?: HeadersInit) {
  return {
    accept: "application/json",
    ...(headers ?? {}),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders(init?.headers),
  });
  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : `Backend request failed with status ${response.status}.`;
    throw new BackendRequestError(
      message,
      response.status,
      typeof body?.code === "string" ? body.code : undefined,
    );
  }

  return body as T;
}

function trimToOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function splitLegacyLocation(address?: string | null) {
  if (!address) {
    return {};
  }

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  return {
    city: parts[0],
    region: parts.length > 1 ? parts.slice(1).join(", ") : undefined,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function fallbackCoordinatesForLocation(city?: string, region?: string) {
  const locationText = `${city ?? ""} ${region ?? ""}`.toLowerCase();

  if (locationText.includes("aden")) {
    return { latitude: 12.7855, longitude: 45.0187 };
  }

  return { latitude: 0, longitude: 0 };
}

function buildGatewayLocationInput(
  address: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  current: { city: string; region: string },
) {
  if (latitude == null || longitude == null) {
    throw new BackendRequestError(
      "A saved location is required before this profile can be updated through the platform backend.",
      400,
    );
  }

  const parsed = splitLegacyLocation(address);
  const city = parsed.city ?? current.city;
  const region = parsed.region ?? current.region;

  if (!city || !region) {
    throw new BackendRequestError(
      "A city and region are required before this profile can be updated through the platform backend.",
      400,
    );
  }

  return {
    city,
    region,
    latitude,
    longitude,
  };
}

function buildGatewayHeaders(bridge: BackendActorBridge): HeadersInit {
  const authHeaders = getGatewayAuthorizationHeaders();

  if (authHeaders) {
    return authHeaders;
  }

  return {
    "x-dev-user-id": bridge.user.id,
    "x-dev-user-role":
      bridge.userRole === "super_admin" ? "admin" : bridge.userRole,
    ...(bridge.user.email ? { "x-dev-user-email": bridge.user.email } : {}),
    ...(bridge.profileId ? { "x-dev-profile-id": bridge.profileId } : {}),
    ...(bridge.clinicId ? { "x-dev-clinic-id": bridge.clinicId } : {}),
    ...(bridge.displayName ? { "x-dev-display-name": bridge.displayName } : {}),
    "x-dev-onboarding-completed": String(Boolean(bridge.onboardingCompleted)),
    "x-dev-verification-status": mapVerificationStatusToGateway(
      bridge.verificationStatus,
    ),
  };
}

function mapProfessionalSummaryToLegacy(
  item: PlatformProfessionalSummary,
): LegacyProfessional {
  const qualifications = item.licenseNumber
    ? item.licenseNumber
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return {
    id: item.id,
    full_name: item.fullName,
    avatar_url: item.profileImageUrl ?? null,
    bio: item.bio ?? item.headline ?? null,
    specialties: [item.specialty, ...item.languages].filter(Boolean),
    qualifications,
    hourly_rate: null,
    rating_avg: item.rating ?? 0,
    rating_count: null,
    verification_status: mapVerificationStatus(item.verificationStatus),
    is_available: item.availability.status === "available",
    location_address: buildLocationAddress(item.city, item.region),
    location_lat: item.latitude,
    location_lng: item.longitude,
    phone: item.primaryPhone ?? null,
    onboarding_completed: item.onboardingCompleted,
  };
}

function mapClinicSummaryToLegacy(item: PlatformClinicSummary): LegacyClinic {
  return {
    id: item.id,
    name: item.organizationName,
    phone: item.contactPhone ?? null,
    logo_url: item.logoUrl ?? null,
    description: item.description ?? null,
    address: buildLocationAddress(item.city, item.region),
    location_lat: item.latitude,
    location_lng: item.longitude,
    rating_avg: item.rating ?? 0,
    rating_count: null,
    verification_status: mapVerificationStatus(item.verificationStatus),
    onboarding_completed: item.onboardingCompleted,
  };
}

function mapJobToLegacyShift(item: PlatformJob): LegacyShift {
  const startsAt = toDateParts(item.startsAt);
  const endsAt = item.endsAt ? toDateParts(item.endsAt) : { time: "" };
  const isClinicRedacted =
    item.clinicId === REDACTED_CLINIC_ID ||
    item.clinicName === REDACTED_CLINIC_NAME;

  return {
    id: item.id,
    source: "platform",
    title: item.title,
    role_required: item.specialty,
    shift_date: startsAt.shiftDate,
    start_time: startsAt.time,
    end_time: endsAt.time,
    hourly_rate: toHourlyRate(item.compensation),
    currency: item.compensation.currency,
    location_address: buildLocationAddress(
      item.location.city,
      item.location.region,
    ),
    description: item.description ?? item.summary,
    required_certifications: item.requirements ?? null,
    is_urgent: false,
    is_filled: item.status !== "open",
    clinic: {
      id: item.clinicId,
      name: isClinicRedacted ? "" : item.clinicName,
      address: buildLocationAddress(item.location.city, item.location.region),
      rating_avg: null,
      logo_url: null,
    },
  };
}

function mapBookingToLegacy(item: PlatformBooking): LegacyBooking {
  const startsAt = toDateParts(item.startsAt);
  const endsAt = item.endsAt ? toDateParts(item.endsAt) : { time: "" };

  return {
    id: item.id,
    status: item.status,
    notes: item.notes ?? null,
    check_in_time: null,
    check_out_time: null,
    professional_id: item.professionalId,
    professional_name: item.professionalName,
    clinic_id: item.clinicId,
    shift: {
      id: item.jobId,
      title: item.jobTitle,
      shift_date: startsAt.shiftDate,
      start_time: startsAt.time,
      end_time: endsAt.time,
      hourly_rate: toHourlyRate(item.compensation),
      location_address: buildLocationAddress(
        item.location.city,
        item.location.region,
      ),
      clinic: {
        id: item.clinicId,
        name: item.clinicName,
      },
    },
  };
}

async function getCurrentProfessionalSummary(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<PlatformProfessionalSummary>(
    `${apiGatewayBaseUrl}/profiles/me`,
    {
      headers: buildGatewayHeaders(bridge),
    },
  );
}

async function getCurrentClinicSummary(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<PlatformClinicSummary>(`${apiGatewayBaseUrl}/clinics/me`, {
    headers: buildGatewayHeaders(bridge),
  });
}

export async function listLegacyProfessionals(filters?: {
  specialty?: string;
  verificationStatus?:
    | "not_started"
    | "pending_review"
    | "approved"
    | "rejected";
}) {
  if (!platformApiBaseUrl) {
    throw new BackendRequestError("Platform API is not configured.", 500);
  }

  const params = new URLSearchParams();
  if (filters?.specialty) {
    params.set("specialty", filters.specialty);
  }
  if (filters?.verificationStatus) {
    params.set("verificationStatus", filters.verificationStatus);
  }

  const response = await requestJson<{ items: PlatformProfessionalSummary[] }>(
    `${platformApiBaseUrl}/profiles${params.size > 0 ? `?${params.toString()}` : ""}`,
  );

  return response.items.map(mapProfessionalSummaryToLegacy);
}

export async function getLegacyProfessionalById(profileId: string) {
  if (!platformApiBaseUrl) {
    throw new BackendRequestError("Platform API is not configured.", 500);
  }

  const response = await requestJson<PlatformProfessionalSummary>(
    `${platformApiBaseUrl}/profiles/${encodeURIComponent(profileId)}`,
  );

  return mapProfessionalSummaryToLegacy(response);
}

export async function listLegacyClinics(filters?: {
  city?: string;
  facilityType?: string;
  verificationStatus?:
    | "not_started"
    | "pending_review"
    | "approved"
    | "rejected";
}) {
  if (!platformApiBaseUrl) {
    throw new BackendRequestError("Platform API is not configured.", 500);
  }

  const params = new URLSearchParams();
  if (filters?.city) {
    params.set("city", filters.city);
  }
  if (filters?.facilityType) {
    params.set("facilityType", filters.facilityType);
  }
  if (filters?.verificationStatus) {
    params.set("verificationStatus", filters.verificationStatus);
  }

  const response = await requestJson<{ items: PlatformClinicSummary[] }>(
    `${platformApiBaseUrl}/clinics${params.size > 0 ? `?${params.toString()}` : ""}`,
  );

  return response.items.map(mapClinicSummaryToLegacy);
}

export async function getLegacyClinicById(clinicId: string) {
  if (!platformApiBaseUrl) {
    throw new BackendRequestError("Platform API is not configured.", 500);
  }

  const response = await requestJson<PlatformClinicSummary>(
    `${platformApiBaseUrl}/clinics/${encodeURIComponent(clinicId)}`,
  );

  return mapClinicSummaryToLegacy(response);
}

export async function listLegacyJobs(filters?: {
  specialty?: string;
  city?: string;
  employmentType?: "temporary_shift" | "permanent_role" | "contract";
  verificationRequired?: boolean;
}) {
  if (!platformApiBaseUrl) {
    throw new BackendRequestError("Platform API is not configured.", 500);
  }

  const params = new URLSearchParams();
  if (filters?.specialty) {
    params.set("specialty", filters.specialty);
  }
  if (filters?.city) {
    params.set("city", filters.city);
  }
  if (filters?.employmentType) {
    params.set("employmentType", filters.employmentType);
  }
  if (typeof filters?.verificationRequired === "boolean") {
    params.set("verificationRequired", String(filters.verificationRequired));
  }

  const response = await requestJson<{ items: PlatformJob[] }>(
    `${platformApiBaseUrl}/jobs${params.size > 0 ? `?${params.toString()}` : ""}`,
  );

  return response.items.map(mapJobToLegacyShift);
}

export async function listCurrentClinicLegacyJobs(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const response = await requestJson<{ items: PlatformJob[] }>(
    `${apiGatewayBaseUrl}/jobs/mine`,
    {
      headers: buildGatewayHeaders(bridge),
    },
  );

  return response.items.map(mapJobToLegacyShift);
}

export async function getLegacyJobById(jobId: string) {
  if (!platformApiBaseUrl) {
    throw new BackendRequestError("Platform API is not configured.", 500);
  }

  const response = await requestJson<PlatformJob>(
    `${platformApiBaseUrl}/jobs/${encodeURIComponent(jobId)}`,
  );

  return mapJobToLegacyShift(response);
}

export async function getCurrentProfessionalProfile(
  bridge: BackendActorBridge,
) {
  return mapProfessionalSummaryToLegacy(
    await getCurrentProfessionalSummary(bridge),
  );
}

export async function getCurrentClinicProfile(bridge: BackendActorBridge) {
  return mapClinicSummaryToLegacy(await getCurrentClinicSummary(bridge));
}

export async function getCurrentActor(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<PlatformActor>(`${apiGatewayBaseUrl}/me`, {
    headers: buildGatewayHeaders(bridge),
  });
}

export async function getGatewayOnboardingStatus(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<GatewayOnboardingStatus>(
    `${apiGatewayBaseUrl}/onboarding/status`,
    {
      headers: buildGatewayHeaders(bridge),
    },
  );
}

export async function updateGatewayOnboardingStatus(
  bridge: BackendActorBridge,
  input: {
    requiredDocuments: string[];
    missingDocuments: string[];
    nextAction: string;
    submitForReview: boolean;
  },
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<GatewayOnboardingStatus>(
    `${apiGatewayBaseUrl}/onboarding/status`,
    {
      method: "PATCH",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export async function listLegacyBookings(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const response = await requestJson<{ items: PlatformBooking[] }>(
    `${apiGatewayBaseUrl}/bookings`,
    {
      headers: buildGatewayHeaders(bridge),
    },
  );

  return response.items.map(mapBookingToLegacy);
}

export async function requestLegacyBooking(
  bridge: BackendActorBridge,
  jobId: string,
  notes?: string,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const response = await requestJson<PlatformBooking>(
    `${apiGatewayBaseUrl}/bookings`,
    {
      method: "POST",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jobId,
        ...(notes ? { notes } : {}),
      }),
    },
  );

  return mapBookingToLegacy(response);
}

export async function listGatewayConversations(bridge: BackendActorBridge) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<{ items: PlatformConversationSummary[]; total: number }>(
    `${apiGatewayBaseUrl}/conversations`,
    {
      headers: buildGatewayHeaders(bridge),
    },
  );
}

export async function startGatewayConversation(
  bridge: BackendActorBridge,
  input: { professionalId: string; clinicId: string },
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<PlatformConversationSummary>(
    `${apiGatewayBaseUrl}/conversations`,
    {
      method: "POST",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export async function listGatewayConversationMessages(
  bridge: BackendActorBridge,
  conversationId: string,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<{ items: PlatformConversationMessage[]; total: number }>(
    `${apiGatewayBaseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      headers: buildGatewayHeaders(bridge),
    },
  );
}

export async function sendGatewayConversationMessage(
  bridge: BackendActorBridge,
  conversationId: string,
  input: {
    content: string;
    fileUrl?: string | null;
    fileType?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
  },
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<PlatformConversationMessage>(
    `${apiGatewayBaseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

export async function deleteGatewayConversationMessage(
  bridge: BackendActorBridge,
  conversationId: string,
  messageId: string,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<{ deleted: true; id: string }>(
    `${apiGatewayBaseUrl}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
      headers: buildGatewayHeaders(bridge),
    },
  );
}

export async function deleteGatewayConversation(
  bridge: BackendActorBridge,
  conversationId: string,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  return requestJson<{ deleted: true; id: string }>(
    `${apiGatewayBaseUrl}/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "DELETE",
      headers: buildGatewayHeaders(bridge),
    },
  );
}

export async function updateLegacyBookingStatus(
  bridge: BackendActorBridge,
  bookingId: string,
  status: "accepted" | "cancelled" | "confirmed" | "completed",
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const response = await requestJson<PlatformBooking>(
    `${apiGatewayBaseUrl}/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "PATCH",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  return mapBookingToLegacy(response);
}

export async function createLegacyJob(
  bridge: BackendActorBridge,
  draft: LegacyShiftCreateDraft,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const current = await getCurrentClinicSummary(bridge);
  const title =
    trimToOptional(draft.title) ??
    trimToOptional(draft.role_required) ??
    "Shift";
  const specialty = trimToOptional(draft.role_required) ?? title;
  const description =
    trimToOptional(draft.description) ?? `Open shift for ${specialty}.`;
  const parsedLocation = splitLegacyLocation(draft.location_address);
  const city = parsedLocation.city ?? current.city;
  const region = parsedLocation.region ?? current.region;
  const fallbackCoordinates = fallbackCoordinatesForLocation(city, region);
  const latitude = isFiniteNumber(current.latitude)
    ? current.latitude
    : fallbackCoordinates.latitude;
  const longitude = isFiniteNumber(current.longitude)
    ? current.longitude
    : fallbackCoordinates.longitude;
  const startsAt = buildLocalDateTimeIso(draft.shift_date, draft.start_time);
  const endsAt = buildLocalDateTimeIso(draft.shift_date, draft.end_time);

  if (endsAt <= startsAt) {
    endsAt.setDate(endsAt.getDate() + 1);
  }

  const requirements =
    draft.required_certifications?.map((item) => item.trim()).filter(Boolean) ??
    [];

  const response = await requestJson<PlatformJob>(`${apiGatewayBaseUrl}/jobs`, {
    method: "POST",
    headers: {
      ...buildGatewayHeaders(bridge),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title,
      specialty,
      employmentType: "temporary_shift",
      location: {
        city,
        region,
        latitude,
        longitude,
      },
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      compensation: {
        amount: draft.hourly_rate,
        currency: "YER",
        unit: "hour",
      },
      verificationRequired: true,
      summary: description.slice(0, 240),
      description,
      requirements: requirements.length > 0 ? requirements : [specialty],
      languages: ["en"],
      contactPreference: "in_app_chat",
    }),
  });

  return mapJobToLegacyShift(response);
}

export async function updateCurrentProfessionalProfile(
  bridge: BackendActorBridge,
  draft: ProfessionalProfileUpdateDraft,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const current = await getCurrentProfessionalSummary(bridge);
  const primarySpecialty =
    draft.specialties.map((value) => value.trim()).find(Boolean) ??
    current.specialty;
  const secondarySpecialties = draft.specialties
    .map((value) => value.trim())
    .filter((value) => value && value !== primarySpecialty);
  const qualifications = draft.qualifications
    .map((value) => value.trim())
    .filter(Boolean);
  const licenseNumber =
    qualifications.length > 0
      ? qualifications.join(", ")
      : current.licenseNumber;

  const response = await requestJson<PlatformProfessionalSummary>(
    `${apiGatewayBaseUrl}/profiles/me`,
    {
      method: "PATCH",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fullName: draft.fullName.trim(),
        specialty: primarySpecialty,
        ...(trimToOptional(current.headline)
          ? { headline: trimToOptional(current.headline) }
          : {}),
        ...(trimToOptional(draft.bio)
          ? { bio: trimToOptional(draft.bio) }
          : {}),
        ...(trimToOptional(licenseNumber)
          ? { licenseNumber: trimToOptional(licenseNumber) }
          : {}),
        ...(trimToOptional(draft.primaryPhone)
          ? { primaryPhone: trimToOptional(draft.primaryPhone) }
          : {}),
        yearsExperience: current.yearsExperience,
        languages:
          secondarySpecialties.length > 0
            ? secondarySpecialties
            : [primarySpecialty],
        availability: current.availability,
        location: buildGatewayLocationInput(
          draft.locationAddress,
          draft.locationLat,
          draft.locationLng,
          {
            city: current.city,
            region: current.region,
          },
        ),
      }),
    },
  );

  return mapProfessionalSummaryToLegacy(response);
}

export async function updateCurrentClinicProfile(
  bridge: BackendActorBridge,
  draft: ClinicProfileUpdateDraft,
) {
  if (!apiGatewayBaseUrl) {
    throw new BackendRequestError("API gateway is not configured.", 500);
  }

  const current = await getCurrentClinicSummary(bridge);
  const response = await requestJson<PlatformClinicSummary>(
    `${apiGatewayBaseUrl}/clinics/me`,
    {
      method: "PATCH",
      headers: {
        ...buildGatewayHeaders(bridge),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        organizationName: draft.organizationName.trim(),
        facilityType: current.facilityType,
        ...(trimToOptional(draft.description)
          ? { description: trimToOptional(draft.description) }
          : {}),
        ...(trimToOptional(draft.contactPhone)
          ? { contactPhone: trimToOptional(draft.contactPhone) }
          : {}),
        ...(trimToOptional(draft.websiteUrl)
          ? { websiteUrl: trimToOptional(draft.websiteUrl) }
          : {}),
        services: current.services,
        location: buildGatewayLocationInput(
          draft.address,
          draft.locationLat,
          draft.locationLng,
          {
            city: current.city,
            region: current.region,
          },
        ),
      }),
    },
  );

  return mapClinicSummaryToLegacy(response);
}
