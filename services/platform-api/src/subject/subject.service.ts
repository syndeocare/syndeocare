import {
  getAuthPrincipalBySubject,
  getBookingByIdForSubject,
  getOnboardingStatusBySubject,
  getVerificationStatusBySubject,
  listBookingsForSubject,
  requestBookingBySubject,
} from "@repo/persistence";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateBookingRequestDto } from "./dto/create-booking-request.dto.js";

@Injectable()
export class SubjectService {
  async getActor(subject: string) {
    const actor = await getAuthPrincipalBySubject(subject);

    if (!actor) {
      throw new NotFoundException("Actor subject not found.");
    }

    return actor;
  }

  async getOnboardingStatus(subject: string) {
    const status = await getOnboardingStatusBySubject(subject);

    if (!status) {
      throw new NotFoundException("Onboarding status not found.");
    }

    return status;
  }

  async getVerificationStatus(subject: string) {
    const status = await getVerificationStatusBySubject(subject);

    if (!status) {
      throw new NotFoundException("Verification status not found.");
    }

    return status;
  }

  async listBookings(subject: string) {
    const items = await listBookingsForSubject(subject);

    return {
      items,
      total: items.length,
    };
  }

  async getBookingById(subject: string, bookingId: string) {
    const booking = await getBookingByIdForSubject(subject, bookingId);

    if (!booking) {
      throw new NotFoundException(
        "Booking not found for the provided subject.",
      );
    }

    return booking;
  }

  async requestBooking(subject: string, input: CreateBookingRequestDto) {
    const result = await requestBookingBySubject(subject, input);

    if (result.ok) {
      return result.data;
    }

    if (result.statusCode === 403) {
      throw new ForbiddenException(result.message);
    }

    if (result.statusCode === 404) {
      throw new NotFoundException(result.message);
    }

    throw new ConflictException(result.message);
  }
}
