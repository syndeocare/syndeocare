export type UserRole = "admin" | "clinic" | "professional";
export type VerificationStatus =
  | "not_started"
  | "pending_review"
  | "approved"
  | "rejected";

export type Principal = {
  sub: string;
  actorId?: string;
  email?: string;
  emailVerified?: boolean;
  role: UserRole;
  permissions: string[];
  clinicId?: string;
  profileId?: string;
  onboardingCompleted: boolean;
  verificationStatus: VerificationStatus;
  displayName?: string;
  profileImageUrl?: string;
};

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn?: number;
  scope?: string;
};

export type AuthSession = {
  principal: Principal;
  tokens: TokenSet;
  isNewUser: boolean;
  resolvedAt: number;
};

export type ApiList<T> = {
  items: T[];
  total: number;
};

export type CatalogKind =
  | "certification"
  | "document_type"
  | "job_role"
  | "specialty";

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  name: string;
  nameAr: string | null;
  abbreviation: string | null;
  description: string | null;
  isActive: boolean;
  isRequired: boolean;
  appliesTo: string;
  allowedExtensions: string[];
  maxSizeMb: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type LocationValue = {
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

export type Money = {
  amount: number;
  currency: string;
  unit: "hour" | "day" | "shift" | "contract";
};

export type Job = {
  id: string;
  title: string;
  specialty: string;
  employmentType: "temporary_shift" | "permanent_role" | "contract";
  status: "open" | "filled" | "closed";
  clinicId: string;
  clinicName: string;
  location: LocationValue;
  startsAt: string;
  endsAt?: string;
  compensation: Money;
  verificationRequired: boolean;
  summary: string;
  description?: string;
  requirements?: string[];
  languages: string[];
};

export type JobCreateInput = {
  title: string;
  specialty: string;
  employmentType: Job["employmentType"];
  location: LocationValue;
  startsAt: string;
  endsAt?: string;
  compensation: Money;
  maxApplicants?: number;
  proposalDeadline?: string | null;
  verificationRequired: boolean;
  summary: string;
  description: string;
  requirements: string[];
  languages: string[];
  contactPreference: "direct_phone" | "in_app_chat";
};

export type Booking = {
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
  location: LocationValue;
  compensation: Money;
  notes?: string;
};

export type Conversation = {
  id: string;
  kind: "admin" | "standard";
  displayName: string;
  counterpartRole: UserRole;
  lastMessageAt: string;
  unreadCount?: number;
  lastMessage?: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderActorId: string;
  senderRole: UserRole;
  content: string;
  isRead: boolean;
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
};

export type UploadDescriptor = {
  assetType: string;
  bucket: string;
  expiresIn: number;
  key: string;
  uploadHeaders: { "content-type": string };
  uploadMethod: "PUT";
  uploadUrl: string;
};

export type ChatMediaUploadResult = {
  assetType: "chat-media";
  fileUrl: string;
  persisted: true;
  resource: "conversation-message";
};

export type ProfileImageUploadResult = {
  assetType: "profile-image";
  assetUrl: string;
  persisted: true;
  resource: "clinic-profile" | "professional-profile";
};

export type AppNotification = {
  id: string;
  recipientExternalUserId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

export type OnboardingStatus = {
  role: UserRole;
  onboardingCompleted: boolean;
  verificationStatus: VerificationStatus;
  requiredDocuments: string[];
  missingDocuments: string[];
  uploadedDocuments: {
    documentType: string;
    bucket: string;
    key: string;
    uploadedAt: string;
  }[];
  nextAction: string;
  submittedAt?: string;
  reviewedAt?: string;
};

export type ProfessionalProfile = {
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
  verificationStatus: VerificationStatus;
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

export type ClinicProfile = {
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
  verificationStatus: VerificationStatus;
  onboardingCompleted: boolean;
  logoUrl?: string;
  openRoles: number;
  rating: number;
};

export type ProfessionalProfileUpdateInput = {
  fullName: string;
  specialty: string;
  headline?: string;
  bio?: string;
  licenseNumber?: string;
  primaryPhone?: string;
  yearsExperience: number;
  languages: string[];
  availability: ProfessionalProfile["availability"];
  location: LocationValue;
};

export type ClinicProfileUpdateInput = {
  organizationName: string;
  facilityType: string;
  description?: string;
  contactPhone?: string;
  websiteUrl?: string;
  services: string[];
  location: LocationValue;
};
