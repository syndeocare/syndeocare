import {
  authPrincipalSchema,
  bookingDetailSchema,
  bookingListResponseSchema,
  bookingRequestInputSchema,
  onboardingStatusSchema,
  verificationStatusResponseSchema,
} from "@repo/contracts";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import {
  CurrentSubject,
  DEV_ACTOR_SUBJECT_HEADER,
} from "../common/current-subject.decorator.js";
import { buildSchemaFromZod } from "../common/swagger.js";
import { CreateBookingRequestDto } from "./dto/create-booking-request.dto.js";
import { SubjectService } from "./subject.service.js";

@ApiTags("subject")
@ApiHeader({
  name: DEV_ACTOR_SUBJECT_HEADER,
  required: true,
  description:
    "Temporary development/testing header used until client auth is connected to the platform API.",
})
@ApiBadRequestResponse({
  description: "The actor subject header is missing or invalid.",
})
@Controller()
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get("me")
  @ApiOperation({ summary: "Read the current actor context." })
  @ApiOkResponse({
    schema: buildSchemaFromZod(authPrincipalSchema, "AuthPrincipal"),
  })
  getMe(@CurrentSubject() subject: string) {
    return this.subjectService.getActor(subject);
  }

  @Get("onboarding/status")
  @ApiOperation({ summary: "Read current onboarding progress." })
  @ApiOkResponse({
    schema: buildSchemaFromZod(onboardingStatusSchema, "OnboardingStatus"),
  })
  getOnboardingStatus(@CurrentSubject() subject: string) {
    return this.subjectService.getOnboardingStatus(subject);
  }

  @Get("verification/status")
  @ApiOperation({ summary: "Read current verification status." })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      verificationStatusResponseSchema,
      "VerificationStatusResponse",
    ),
  })
  getVerificationStatus(@CurrentSubject() subject: string) {
    return this.subjectService.getVerificationStatus(subject);
  }

  @Get("bookings")
  @ApiOperation({ summary: "List bookings visible to the current subject." })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      bookingListResponseSchema,
      "BookingListResponse",
    ),
  })
  listBookings(@CurrentSubject() subject: string) {
    return this.subjectService.listBookings(subject);
  }

  @Get("bookings/:bookingId")
  @ApiOperation({
    summary: "Read booking details visible to the current subject.",
  })
  @ApiParam({ name: "bookingId", type: String })
  @ApiOkResponse({
    schema: buildSchemaFromZod(bookingDetailSchema, "BookingDetail"),
  })
  getBookingById(
    @CurrentSubject() subject: string,
    @Param("bookingId") bookingId: string,
  ) {
    return this.subjectService.getBookingById(subject, bookingId);
  }

  @Post("bookings")
  @ApiOperation({ summary: "Request a booking as the current subject." })
  @ApiBody({
    schema: buildSchemaFromZod(
      bookingRequestInputSchema,
      "BookingRequestInput",
    ),
  })
  @ApiOkResponse({
    schema: buildSchemaFromZod(bookingDetailSchema, "CreatedBookingDetail"),
  })
  requestBooking(
    @CurrentSubject() subject: string,
    @Body() body: CreateBookingRequestDto,
  ) {
    return this.subjectService.requestBooking(subject, body);
  }
}
