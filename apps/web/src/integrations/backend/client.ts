import { BACKEND_CONFIG } from "@/config/backend";
import { getGatewayAuthorizationHeaders } from "@/lib/auth-backend";

type FilterOp =
  | "eq"
  | "neq"
  | "in"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "ilike"
  | "is"
  | "not"
  | "match";

type QueryFilter = {
  column: string;
  op: FilterOp;
  value: unknown;
};

type QueryResult<T = unknown> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};

type QueryAction = "select" | "insert" | "update" | "delete" | "upsert";

const catalogKinds: Record<string, string> = {
  certifications: "certification",
  document_types: "document_type",
  job_roles: "job_role",
  specialties: "specialty",
};

const unsupportedTables = new Set([
  "admin_notes",
  "admin_permissions",
  "admin_roles",
  "legal_pages",
  "push_tokens",
  "ratings",
  "shift_invitations",
]);

function getGatewayBaseUrl() {
  return BACKEND_CONFIG.apiGatewayBaseUrl;
}

function authHeaders() {
  return getGatewayAuthorizationHeaders() ?? {};
}

function createError(message: string) {
  return new Error(message);
}

async function requestGateway<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getGatewayBaseUrl();

  if (!baseUrl) {
    throw createError("API gateway is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const rawText = await response.text();
  const body = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    throw createError(
      (body && typeof body.message === "string" && body.message) ||
        `Gateway request failed with status ${response.status}.`,
    );
  }

  return body as T;
}

function getFilter(filters: QueryFilter[], column: string) {
  return filters.find((filter) => filter.column === column);
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toDateParts(iso: string) {
  const [datePart, timePart = "00:00:00"] = iso.split("T");
  return {
    date: datePart,
    time: timePart.slice(0, 5),
  };
}

function mapCatalogItem(item: any) {
  return {
    id: item.id,
    name: item.name,
    name_ar: item.nameAr ?? item.name_ar ?? null,
    abbreviation: item.abbreviation ?? null,
    description: item.description ?? null,
    is_active: item.isActive ?? item.is_active ?? true,
    is_required: item.isRequired ?? item.is_required ?? false,
    applies_to: item.appliesTo ?? item.applies_to ?? "both",
    allowed_extensions: item.allowedExtensions ?? item.allowed_extensions ?? [],
    max_size_mb: item.maxSizeMb ?? item.max_size_mb ?? 10,
    display_order: item.displayOrder ?? item.display_order ?? 0,
    created_at: item.createdAt ?? item.created_at ?? null,
    updated_at: item.updatedAt ?? item.updated_at ?? null,
  };
}

function mapProfile(item: any) {
  return {
    ...item,
    id: item.id,
    user_id: item.userId ?? item.user_id ?? item.id,
    full_name: item.fullName ?? item.full_name ?? item.displayName ?? "",
    avatar_url: item.profileImageUrl ?? item.avatar_url ?? null,
    bio: item.bio ?? item.headline ?? null,
    specialties: item.specialties ?? [item.specialty].filter(Boolean),
    qualifications: item.qualifications ?? [item.licenseNumber].filter(Boolean),
    hourly_rate: item.hourly_rate ?? null,
    rating_avg: item.rating ?? item.rating_avg ?? 0,
    rating_count: item.rating_count ?? null,
    verification_status:
      item.verificationStatus === "approved"
        ? "verified"
        : item.verificationStatus === "rejected"
          ? "rejected"
          : (item.verification_status ?? "pending"),
    is_available:
      item.availability?.status === "available" || item.is_available || false,
    location_address:
      item.location_address ??
      [item.city, item.region].filter(Boolean).join(", ") ??
      null,
    location_lat: item.latitude ?? item.location_lat ?? null,
    location_lng: item.longitude ?? item.location_lng ?? null,
    onboarding_completed:
      item.onboardingCompleted ?? item.onboarding_completed ?? false,
    phone: item.primaryPhone ?? item.phone ?? null,
  };
}

function mapClinic(item: any) {
  return {
    ...item,
    id: item.id,
    user_id: item.userId ?? item.user_id ?? item.id,
    name: item.organizationName ?? item.name ?? "",
    logo_url: item.logoUrl ?? item.logo_url ?? null,
    description: item.description ?? null,
    phone: item.contactPhone ?? item.phone ?? null,
    address:
      item.address ??
      [item.city, item.region].filter(Boolean).join(", ") ??
      null,
    rating_avg: item.rating ?? item.rating_avg ?? 0,
    rating_count: item.rating_count ?? null,
    verification_status:
      item.verificationStatus === "approved"
        ? "verified"
        : item.verificationStatus === "rejected"
          ? "rejected"
          : (item.verification_status ?? "pending"),
    onboarding_completed:
      item.onboardingCompleted ?? item.onboarding_completed ?? false,
    location_lat: item.latitude ?? item.location_lat ?? null,
    location_lng: item.longitude ?? item.location_lng ?? null,
    settings: {
      website: item.websiteUrl ?? item.settings?.website ?? null,
    },
  };
}

function mapJob(item: any) {
  const startsAt = toDateParts(item.startsAt ?? item.starts_at ?? "");
  const endsAt =
    (item.endsAt ?? item.ends_at)
      ? toDateParts(item.endsAt ?? item.ends_at)
      : null;

  return {
    ...item,
    id: item.id,
    source: item.source ?? (item.clinicId ? "platform" : "legacy"),
    title: item.title,
    role_required: item.specialty ?? item.role_required ?? item.title,
    shift_date: item.shift_date ?? startsAt.date,
    start_time: item.start_time ?? startsAt.time,
    end_time: item.end_time ?? endsAt?.time ?? "",
    hourly_rate:
      item.compensation?.amount ?? item.hourly_rate ?? item.rate ?? 0,
    location_address:
      item.location_address ??
      [item.location?.city, item.location?.region].filter(Boolean).join(", ") ??
      null,
    description: item.description ?? item.summary ?? null,
    required_certifications:
      item.requirements ?? item.required_certifications ?? null,
    is_urgent: item.is_urgent ?? false,
    is_filled: item.status ? item.status !== "open" : item.is_filled,
    clinic_id: item.clinicId ?? item.clinic_id,
    clinic: {
      id: item.clinicId ?? item.clinic?.id,
      name: item.clinicName ?? item.clinic?.name ?? "",
      address:
        [item.location?.city, item.location?.region]
          .filter(Boolean)
          .join(", ") ?? null,
      rating_avg: item.clinic?.rating_avg ?? null,
      logo_url: item.clinic?.logo_url ?? null,
    },
  };
}

function mapBooking(item: any) {
  const startsAt = toDateParts(item.startsAt ?? item.starts_at ?? "");
  const endsAt =
    (item.endsAt ?? item.ends_at)
      ? toDateParts(item.endsAt ?? item.ends_at)
      : null;

  return {
    ...item,
    id: item.id,
    status: item.status,
    professional_id: item.professionalId ?? item.professional_id,
    clinic_id: item.clinicId ?? item.clinic_id,
    shift_id: item.jobId ?? item.shift_id,
    notes: item.notes ?? null,
    check_in_time: item.checkInTime ?? item.check_in_time ?? null,
    check_out_time: item.checkOutTime ?? item.check_out_time ?? null,
    shift: item.shift ?? {
      id: item.jobId,
      title: item.jobTitle,
      shift_date: startsAt.date,
      start_time: startsAt.time,
      end_time: endsAt?.time ?? "",
      hourly_rate: item.compensation?.amount ?? 0,
      location_address:
        [item.location?.city, item.location?.region]
          .filter(Boolean)
          .join(", ") ?? null,
      clinic: {
        id: item.clinicId,
        name: item.clinicName,
      },
    },
  };
}

function mapConversation(item: any) {
  const counterpartRole = item.counterpartRole ?? item.counterpart_role ?? null;
  const displayName = item.displayName ?? item.display_name ?? null;

  return {
    ...item,
    id: item.id,
    kind: item.kind ?? "standard",
    professional_id: item.professionalId ?? item.professional_id ?? null,
    clinic_id: item.clinicId ?? item.clinic_id ?? null,
    admin_id: item.adminSubject ?? item.admin_id ?? null,
    admin_display_name:
      item.adminDisplayName ?? item.admin_display_name ?? displayName,
    admin_email: item.adminEmail ?? item.admin_email ?? null,
    target_type: item.targetType ?? item.target_type ?? counterpartRole,
    target_profile_id:
      item.targetProfileId ?? item.target_profile_id ?? item.professionalId,
    target_clinic_id: item.targetClinicId ?? item.target_clinic_id,
    display_name: displayName,
    counterpart_role: counterpartRole,
    last_message_at: item.lastMessageAt ?? item.last_message_at,
    unread_count: item.unreadCount ?? item.unread_count ?? 0,
    last_message: item.lastMessage ?? item.last_message ?? null,
    last_file_type: item.lastFileType ?? item.last_file_type ?? null,
    created_at: item.createdAt ?? item.created_at ?? item.lastMessageAt,
    updated_at: item.updatedAt ?? item.updated_at ?? item.lastMessageAt,
  };
}

function mapMessage(item: any) {
  const conversationId = item.conversationId ?? item.conversation_id;
  const senderActorId =
    item.senderActorId ?? item.senderSubject ?? item.sender_id;
  const senderRole = item.senderRole ?? item.sender_type ?? item.sender_role;

  return {
    ...item,
    id: item.id,
    conversation_id: conversationId,
    admin_conversation_id: item.admin_conversation_id ?? conversationId,
    sender_id: senderActorId,
    sender_user_id: item.sender_user_id ?? senderActorId,
    sender_type: senderRole,
    sender_role: senderRole,
    content: item.content ?? item.body ?? "",
    is_read: item.isRead ?? item.is_read ?? false,
    message_type: item.messageType ?? item.message_type ?? "text",
    media_url: item.mediaUrl ?? item.media_url ?? item.fileUrl ?? null,
    file_url: item.fileUrl ?? item.file_url ?? item.mediaUrl ?? null,
    file_type: item.fileType ?? item.file_type ?? null,
    file_name: item.fileName ?? item.file_name ?? null,
    file_size: item.fileSize ?? item.file_size ?? null,
    read_at: item.readAt ?? item.read_at ?? null,
    created_at: item.createdAt ?? item.created_at,
  };
}

function normalizeRows(table: string, value: any) {
  const rows = Array.isArray(value?.items)
    ? value.items
    : Array.isArray(value)
      ? value
      : value
        ? [value]
        : [];

  switch (table) {
    case "profiles":
      return rows.map(mapProfile);
    case "clinics":
      return rows.map(mapClinic);
    case "shifts":
      return rows.map(mapJob);
    case "bookings":
      return rows.map(mapBooking);
    case "conversations":
      return rows.map(mapConversation);
    case "messages":
      return rows.map(mapMessage);
    case "certifications":
    case "document_types":
    case "job_roles":
    case "specialties":
      return rows.map(mapCatalogItem);
    default:
      return rows;
  }
}

function applyLocalFilters(rows: any[], filters: QueryFilter[]) {
  return rows.filter((row) =>
    filters.every((filter) => {
      const value = row[filter.column];

      switch (filter.op) {
        case "eq":
          return value === filter.value;
        case "neq":
          return value !== filter.value;
        case "in":
          return Array.isArray(filter.value) && filter.value.includes(value);
        case "gte":
          return value >= filter.value;
        case "lte":
          return value <= filter.value;
        case "gt":
          return value > filter.value;
        case "lt":
          return value < filter.value;
        case "ilike":
          return String(value ?? "")
            .toLowerCase()
            .includes(
              String(filter.value ?? "")
                .replace(/%/g, "")
                .toLowerCase(),
            );
        case "is":
          return filter.value === null ? value == null : value === filter.value;
        default:
          return true;
      }
    }),
  );
}

function emptyResult<T = unknown>(
  data: T,
  count?: number | null,
): QueryResult<T> {
  return { data, error: null, count };
}

class GatewayQueryBuilder {
  private action: QueryAction = "select";
  private filters: QueryFilter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private payload: unknown;
  private countRequested = false;

  constructor(private readonly table: string) {}

  select(_columns = "*", options?: { count?: string; head?: boolean }) {
    this.action = "select";
    this.countRequested = Boolean(options?.count);
    return this;
  }

  insert(payload: unknown) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: unknown) {
    this.action = "upsert";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: "neq", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, op: "in", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: "gte", value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, op: "lte", value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, op: "gt", value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, op: "lt", value });
    return this;
  }

  ilike(column: string, value: unknown) {
    this.filters.push({ column, op: "ilike", value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, op: "is", value });
    return this;
  }

  not(column: string, _operator: string, value: unknown) {
    this.filters.push({ column, op: "not", value });
    return this;
  }

  match(value: Record<string, unknown>) {
    for (const [column, filterValue] of Object.entries(value)) {
      this.eq(column, filterValue);
    }
    return this;
  }

  or(_expression: string) {
    return this;
  }

  contains(_column: string, _value: unknown) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.limitCount = Math.max(0, to - from + 1);
    return this;
  }

  returns() {
    return this;
  }

  throwOnError() {
    return this;
  }

  single() {
    return this.executeSingle(false);
  }

  maybeSingle() {
    return this.executeSingle(true);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async executeSingle(allowEmpty: boolean) {
    const result = await this.execute();

    if (result.error) {
      return result;
    }

    const rows = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    if (rows.length === 0 && allowEmpty) {
      return emptyResult(null, result.count);
    }

    return emptyResult(rows[0] ?? null, result.count);
  }

  private async execute(): Promise<QueryResult> {
    try {
      if (this.action === "select") {
        return await this.executeSelect();
      }

      if (this.action === "insert" || this.action === "upsert") {
        return await this.executeInsert();
      }

      if (this.action === "update") {
        return await this.executeUpdate();
      }

      return await this.executeDelete();
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : createError("Request failed."),
        count: null,
      };
    }
  }

  private async executeSelect() {
    let rows: any[] = [];

    if (catalogKinds[this.table]) {
      const response = await requestGateway<{ items: any[] }>(
        `/catalog?kind=${encodeURIComponent(catalogKinds[this.table])}`,
      );
      rows = normalizeRows(this.table, response);
    } else if (this.table === "profiles") {
      const id = getFilter(this.filters, "id")?.value;
      const userId = getFilter(this.filters, "user_id")?.value;
      const path = id
        ? `/profiles/${encodeURIComponent(String(id))}`
        : userId
          ? "/profiles/me"
          : "/profiles";
      rows = normalizeRows(
        this.table,
        await requestGateway(path, { headers: authHeaders() }),
      );
    } else if (this.table === "clinics") {
      const id = getFilter(this.filters, "id")?.value;
      const userId = getFilter(this.filters, "user_id")?.value;
      const path = id
        ? `/clinics/${encodeURIComponent(String(id))}`
        : userId
          ? "/clinics/me"
          : "/clinics";
      rows = normalizeRows(
        this.table,
        await requestGateway(path, { headers: authHeaders() }),
      );
    } else if (this.table === "shifts") {
      const id = getFilter(this.filters, "id")?.value;
      rows = normalizeRows(
        this.table,
        await requestGateway(
          id ? `/jobs/${encodeURIComponent(String(id))}` : "/jobs",
          { headers: authHeaders() },
        ),
      );
    } else if (this.table === "bookings") {
      const id = getFilter(this.filters, "id")?.value;
      rows = normalizeRows(
        this.table,
        await requestGateway(
          id ? `/bookings/${encodeURIComponent(String(id))}` : "/bookings",
          { headers: authHeaders() },
        ),
      );
    } else if (this.table === "conversations") {
      rows = normalizeRows(
        this.table,
        await requestGateway("/conversations", { headers: authHeaders() }),
      );
    } else if (this.table === "admin_conversations") {
      rows = normalizeRows(
        "conversations",
        await requestGateway("/conversations", { headers: authHeaders() }),
      ).filter((row) => row.kind === "admin");
    } else if (this.table === "messages") {
      const conversationId = getFilter(this.filters, "conversation_id")?.value;
      rows = conversationId
        ? normalizeRows(
            this.table,
            await requestGateway(
              `/conversations/${encodeURIComponent(String(conversationId))}/messages`,
              { headers: authHeaders() },
            ),
          )
        : [];
    } else if (this.table === "admin_messages") {
      const conversationId =
        getFilter(this.filters, "admin_conversation_id")?.value ??
        getFilter(this.filters, "conversation_id")?.value;
      rows = conversationId
        ? normalizeRows(
            "messages",
            await requestGateway(
              `/conversations/${encodeURIComponent(String(conversationId))}/messages`,
              { headers: authHeaders() },
            ),
          )
        : [];
    } else if (this.table === "documents") {
      const status = await requestGateway<any>("/onboarding/status", {
        headers: authHeaders(),
      }).catch(() => ({ uploadedDocuments: [] }));
      rows = asArray(status.uploadedDocuments).map((item: any) => ({
        ...item,
        document_type_id: item.type,
        file_url: item.fileUrl ?? item.signedUrl ?? null,
        status: item.status,
        uploaded_at: item.uploadedAt,
        reviewed_at: item.reviewedAt ?? null,
        rejection_reason: item.rejectionReason ?? null,
      }));
    } else if (unsupportedTables.has(this.table)) {
      rows = [];
    }

    const filtersToApply =
      this.table === "admin_conversations"
        ? this.filters.filter(
            (filter) =>
              ![
                "admin_user_id",
                "target_user_id",
                "target_profile_id",
                "target_clinic_id",
              ].includes(filter.column),
          )
        : this.filters;

    rows = applyLocalFilters(rows, filtersToApply);

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const left = a[column] ?? "";
        const right = b[column] ?? "";
        return ascending
          ? String(left).localeCompare(String(right))
          : String(right).localeCompare(String(left));
      });
    }

    const count = rows.length;

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    return emptyResult(rows, this.countRequested ? count : null);
  }

  private async executeInsert() {
    const rows = asArray(this.payload as any);

    if (this.table === "bookings") {
      const created = [];
      for (const row of rows) {
        created.push(
          mapBooking(
            await requestGateway("/bookings", {
              method: "POST",
              headers: {
                ...authHeaders(),
                "content-type": "application/json",
              },
              body: JSON.stringify({
                jobId: row.jobId ?? row.job_id ?? row.shift_id,
                notes: row.notes,
              }),
            }),
          ),
        );
      }
      return emptyResult(created, created.length);
    }

    if (this.table === "messages") {
      const created = [];
      for (const row of rows) {
        const conversationId = row.conversationId ?? row.conversation_id;
        created.push(
          mapMessage(
            await requestGateway(
              `/conversations/${encodeURIComponent(String(conversationId))}/messages`,
              {
                method: "POST",
                headers: {
                  ...authHeaders(),
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  content: row.content ?? row.body ?? "",
                  fileUrl: row.fileUrl ?? row.file_url ?? row.mediaUrl,
                  fileType: row.fileType ?? row.file_type,
                  fileName: row.fileName ?? row.file_name,
                  fileSize: row.fileSize ?? row.file_size,
                }),
              },
            ),
          ),
        );
      }
      return emptyResult(created, created.length);
    }

    if (this.table === "admin_messages") {
      const created = [];
      for (const row of rows) {
        const conversationId =
          row.conversationId ??
          row.conversation_id ??
          row.admin_conversation_id;
        created.push(
          mapMessage(
            await requestGateway(
              `/conversations/${encodeURIComponent(String(conversationId))}/messages`,
              {
                method: "POST",
                headers: {
                  ...authHeaders(),
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  content: row.content ?? "",
                  fileUrl: row.fileUrl ?? row.file_url,
                  fileType: row.fileType ?? row.file_type,
                  fileName: row.fileName ?? row.file_name,
                  fileSize: row.fileSize ?? row.file_size,
                }),
              },
            ),
          ),
        );
      }
      return emptyResult(created, created.length);
    }

    if (this.table === "conversations") {
      const created = [];
      for (const row of rows) {
        created.push(
          mapConversation(
            await requestGateway("/conversations", {
              method: "POST",
              headers: {
                ...authHeaders(),
                "content-type": "application/json",
              },
              body: JSON.stringify({
                professionalId: row.professionalId ?? row.professional_id,
                clinicId: row.clinicId ?? row.clinic_id,
              }),
            }),
          ),
        );
      }
      return emptyResult(created, created.length);
    }

    return emptyResult(rows, rows.length);
  }

  private async executeUpdate() {
    const id = getFilter(this.filters, "id")?.value;
    const payload = (this.payload ?? {}) as Record<string, unknown>;

    if (this.table === "bookings" && id && typeof payload.status === "string") {
      const updated = mapBooking(
        await requestGateway(`/bookings/${encodeURIComponent(String(id))}`, {
          method: "PATCH",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          body: JSON.stringify({ status: payload.status }),
        }),
      );

      return emptyResult([updated], 1);
    }

    return emptyResult([{ id, ...payload }], 1);
  }

  private async executeDelete() {
    const id = getFilter(this.filters, "id")?.value;

    if (this.table === "messages" || this.table === "admin_messages") {
      const conversationId =
        getFilter(this.filters, "conversation_id")?.value ??
        getFilter(this.filters, "admin_conversation_id")?.value;

      if (id && conversationId) {
        await requestGateway(
          `/conversations/${encodeURIComponent(String(conversationId))}/messages/${encodeURIComponent(String(id))}`,
          {
            method: "DELETE",
            headers: authHeaders(),
          },
        );

        return emptyResult([], 1);
      }
    }

    if (
      this.table === "conversations" ||
      this.table === "admin_conversations"
    ) {
      if (id) {
        await requestGateway(
          `/conversations/${encodeURIComponent(String(id))}`,
          {
            method: "DELETE",
            headers: authHeaders(),
          },
        );

        return emptyResult([], 1);
      }
    }

    return emptyResult([], 0);
  }
}

export const backendDb = {
  auth: {
    async getSession() {
      return { data: { session: null }, error: null };
    },
  },
  from(table: string) {
    return new GatewayQueryBuilder(table) as any;
  },
  rpc(_name: string, _args?: Record<string, unknown>) {
    return Promise.resolve({ data: false, error: null });
  },
  storage: {
    from(_bucket: string) {
      return {
        async createSignedUrl(path: string) {
          return {
            data: { signedUrl: path },
            error: null,
          };
        },
      };
    },
  },
};
