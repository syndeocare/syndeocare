import { BACKEND_CONFIG } from "@/config/backend";
import { getGatewayAuthorizationHeaders } from "@/lib/auth-backend";

type NotificationType =
  | "booking_request"
  | "booking_accepted"
  | "booking_declined"
  | "booking_cancelled"
  | "booking_confirmed"
  | "booking_checked_in"
  | "booking_completed"
  | "new_message"
  | "verification_update"
  | "rating_received"
  | "shift_reminder"
  | "shift_invitation"
  | "invitation_accepted"
  | "document_approved"
  | "document_rejected"
  | "profile_verified"
  | "shift_created";

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface AppNotification {
  id: string;
  recipientExternalUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

const API_GATEWAY_BASE_URL = BACKEND_CONFIG.apiGatewayBaseUrl;

const invokeGatewayNotifications = async <T>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: HeadersInit } = {},
) => {
  const headers = getGatewayAuthorizationHeaders();

  if (!API_GATEWAY_BASE_URL || !headers) {
    throw new Error("Owned notifications are not available.");
  }

  const response = await fetch(`${API_GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...headers,
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "Notification request failed.",
    );
  }

  return payload as T;
};

export const listNotifications = async () => {
  if (API_GATEWAY_BASE_URL && getGatewayAuthorizationHeaders()) {
    const response = await invokeGatewayNotifications<{
      items: AppNotification[];
    }>("/notifications");
    return response.items;
  }

  throw new Error("Owned notifications are not available.");
};

export const markNotificationAsRead = async (id: string) => {
  if (API_GATEWAY_BASE_URL && getGatewayAuthorizationHeaders()) {
    return invokeGatewayNotifications<AppNotification>(
      `/notifications/${encodeURIComponent(id)}/read`,
      {
        method: "PATCH",
      },
    );
  }

  throw new Error("Owned notifications are not available.");
};

export const markAllNotificationsAsRead = async () => {
  if (API_GATEWAY_BASE_URL && getGatewayAuthorizationHeaders()) {
    return invokeGatewayNotifications<{ updated: number }>(
      "/notifications/read-all",
      {
        method: "PATCH",
      },
    );
  }

  throw new Error("Owned notifications are not available.");
};

export const deleteNotification = async (id: string) => {
  if (API_GATEWAY_BASE_URL && getGatewayAuthorizationHeaders()) {
    return invokeGatewayNotifications<{ deleted: number }>(
      `/notifications/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  }

  throw new Error("Owned notifications are not available.");
};

export const clearNotifications = async () => {
  if (API_GATEWAY_BASE_URL && getGatewayAuthorizationHeaders()) {
    return invokeGatewayNotifications<{ deleted: number }>("/notifications", {
      method: "DELETE",
    });
  }

  throw new Error("Owned notifications are not available.");
};

export const getAdminNotificationCount = async (externalUserId: string) => {
  if (API_GATEWAY_BASE_URL && getGatewayAuthorizationHeaders()) {
    return invokeGatewayNotifications<{ count: number }>(
      `/admin/notifications/${encodeURIComponent(externalUserId)}/count`,
    );
  }

  throw new Error("Owned notifications are not available.");
};

/**
 * Create a notification for a user
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
}: NotificationData): Promise<void> => {
  try {
    if (!API_GATEWAY_BASE_URL || !getGatewayAuthorizationHeaders()) {
      throw new Error("Owned notifications are not available.");
    }

    await invokeGatewayNotifications("/notifications", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        recipientExternalUserId: userId,
        type,
        title,
        message,
        data,
      }),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

/**
 * Notification helpers for specific events
 */
export const notifyBookingRequest = async (
  clinicUserId: string,
  professionalName: string,
  shiftTitle: string,
  bookingId: string,
) => {
  await createNotification({
    userId: clinicUserId,
    type: "booking_request",
    title: "New Booking Request",
    message: `${professionalName} has applied for "${shiftTitle}"`,
    data: { bookingId },
  });
};

export const notifyBookingAccepted = async (
  professionalUserId: string,
  clinicName: string,
  shiftTitle: string,
  bookingId: string,
) => {
  await createNotification({
    userId: professionalUserId,
    type: "booking_accepted",
    title: "Booking Accepted!",
    message: `${clinicName} has accepted your application for "${shiftTitle}"`,
    data: { bookingId },
  });
};

export const notifyBookingDeclined = async (
  professionalUserId: string,
  clinicName: string,
  shiftTitle: string,
  bookingId: string,
) => {
  await createNotification({
    userId: professionalUserId,
    type: "booking_declined",
    title: "Application Declined",
    message: `Your application for "${shiftTitle}" at ${clinicName} was not accepted`,
    data: { bookingId },
  });
};

export const notifyBookingCancelled = async (
  targetUserId: string,
  cancellerName: string,
  shiftTitle: string,
  reason: string | null,
  bookingId: string,
) => {
  await createNotification({
    userId: targetUserId,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: reason
      ? `"${shiftTitle}" has been cancelled by ${cancellerName}. Reason: ${reason}`
      : `"${shiftTitle}" has been cancelled by ${cancellerName}`,
    data: { bookingId },
  });
};

export const notifyNewMessage = async (
  recipientUserId: string,
  senderName: string,
  conversationId: string,
) => {
  await createNotification({
    userId: recipientUserId,
    type: "new_message",
    title: "New Message",
    message: `You have a new message from ${senderName}`,
    data: { conversationId },
  });
};

export const notifyDocumentApproved = async (
  userId: string,
  documentName: string,
  documentId: string,
) => {
  await createNotification({
    userId,
    type: "document_approved",
    title: "Document Approved",
    message: `Your "${documentName}" has been verified and approved`,
    data: { documentId },
  });
};

export const notifyDocumentRejected = async (
  userId: string,
  documentName: string,
  reason: string | null,
  documentId: string,
) => {
  await createNotification({
    userId,
    type: "document_rejected",
    title: "Document Rejected",
    message: reason
      ? `Your "${documentName}" was rejected: ${reason}`
      : `Your "${documentName}" was rejected. Please re-upload.`,
    data: { documentId },
  });
};

export const notifyProfileVerified = async (
  userId: string,
  profileType: "professional" | "clinic",
) => {
  await createNotification({
    userId,
    type: "profile_verified",
    title: "Profile Verified!",
    message:
      profileType === "professional"
        ? "Congratulations! Your professional profile has been verified. You can now apply for shifts."
        : "Congratulations! Your clinic has been verified. You can now post shifts.",
    data: {},
  });
};

export const notifyRatingReceived = async (
  userId: string,
  rating: number,
  reviewerName: string,
  bookingId: string,
) => {
  await createNotification({
    userId,
    type: "rating_received",
    title: "New Review",
    message: `${reviewerName} gave you a ${rating}-star rating`,
    data: { bookingId, rating },
  });
};

export const notifyShiftReminder = async (
  professionalUserId: string,
  shiftTitle: string,
  clinicName: string,
  shiftDate: string,
  startTime: string,
  bookingId: string,
) => {
  await createNotification({
    userId: professionalUserId,
    type: "shift_reminder",
    title: "Upcoming Shift Reminder",
    message: `Reminder: You have a shift "${shiftTitle}" at ${clinicName} on ${shiftDate} at ${startTime}`,
    data: { bookingId },
  });
};

export const notifyShiftCreated = async (
  clinicUserId: string,
  shiftTitle: string,
  shiftId: string,
) => {
  await createNotification({
    userId: clinicUserId,
    type: "shift_created",
    title: "Shift Created",
    message: `Your shift "${shiftTitle}" has been posted and is now visible to professionals`,
    data: { shiftId },
  });
};
