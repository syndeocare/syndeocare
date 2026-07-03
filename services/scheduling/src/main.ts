import {
  bookingDetailSchema,
  bookingListResponseSchema,
  bookingRequestInputSchema,
  bookingStatusUpdateInputSchema,
  domainEventCatalog,
  jobListingCreateInputSchema,
  jobListingDetailSchema,
  jobListingListResponseSchema,
  jobListingUpdateInputSchema,
} from "@repo/contracts";
import {
  createJobListingBySubject,
  getBookingByIdForSubject,
  getJobListingById,
  listJobListingsBySubject,
  listBookingsForSubject,
  listJobListings,
  requestBookingBySubject,
  updateBookingStatusBySubject,
  updateJobListingBySubject,
} from "@repo/persistence";
import { publishDomainEvent, startService } from "@repo/service-core";
import { z } from "zod";

const subjectParamsSchema = z.object({
  subject: z.string().min(1),
});
const jobIdParamsSchema = z.object({
  jobId: z.string().min(1),
});
const bookingParamsSchema = z.object({
  bookingId: z.string().min(1),
  subject: z.string().min(1),
});
const jobFiltersSchema = z.object({
  specialty: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  employmentType: z
    .enum(["temporary_shift", "permanent_role", "contract"])
    .optional(),
  verificationRequired: z.enum(["true", "false"]).optional(),
});

void startService({
  serviceName: "scheduling",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.scheduling,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "scheduling",
      responsibility: "Shifts, bookings, and workforce scheduling workflows.",
    }));

    app.get("/internal/jobs", async (request, reply) => {
      const parsedQuery = jobFiltersSchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "The job filters were invalid.",
        });
      }

      const items = await listJobListings({
        city: parsedQuery.data.city,
        employmentType: parsedQuery.data.employmentType,
        specialty: parsedQuery.data.specialty,
        verificationRequired:
          parsedQuery.data.verificationRequired === undefined
            ? undefined
            : parsedQuery.data.verificationRequired === "true",
      });

      return bookingListResponseSchema
        .omit({ items: true })
        .extend({
          items: z.array(jobListingListResponseSchema.shape.items.element),
        })
        .parse({
          items: items.map((job) =>
            jobListingDetailSchema
              .omit({
                contactPreference: true,
                description: true,
                requirements: true,
              })
              .parse(job),
          ),
          total: items.length,
        });
    });

    app.get("/internal/jobs/owned/:subject", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);

      if (!parsedSubject.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid subject is required.",
        });
      }

      const items = await listJobListingsBySubject(parsedSubject.data.subject);

      return jobListingListResponseSchema.parse({
        items,
        total: items.length,
      });
    });

    app.get("/internal/jobs/:jobId", async (request, reply) => {
      const parsedParams = jobIdParamsSchema.safeParse(request.params);

      if (!parsedParams.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid job id is required.",
        });
      }

      const job = await getJobListingById(parsedParams.data.jobId);

      if (!job) {
        return reply.code(404).send({
          code: "JOB_NOT_FOUND",
          message: "No job was found for the requested id.",
        });
      }

      return jobListingDetailSchema.parse(job);
    });

    app.patch("/internal/jobs/:subject/:jobId", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedJob = jobIdParamsSchema.safeParse(request.params);
      const parsedBody = jobListingUpdateInputSchema.safeParse(request.body);

      if (!parsedSubject.success || !parsedJob.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid clinic subject, job id, and update are required.",
        });
      }

      const job = await updateJobListingBySubject(
        parsedSubject.data.subject,
        parsedJob.data.jobId,
        parsedBody.data,
      );

      if (!job) {
        return reply.code(404).send({
          code: "JOB_NOT_FOUND",
          message: "No owned job was found for the requested id.",
        });
      }

      return jobListingDetailSchema.parse(job);
    });

    app.post("/internal/jobs/:subject", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedBody = jobListingCreateInputSchema.safeParse(request.body);

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid clinic subject and job payload are required.",
        });
      }

      const job = await createJobListingBySubject(
        parsedSubject.data.subject,
        parsedBody.data,
      );

      if (!job) {
        return reply.code(404).send({
          code: "CLINIC_NOT_FOUND",
          message: "No clinic profile was found for the authenticated actor.",
        });
      }

      await publishDomainEvent({
        name: "scheduling.shift.posted",
        payload: {
          clinicId: job.clinicId,
          employmentType: job.employmentType,
          specialty: job.specialty,
          status: job.status,
          title: job.title,
        },
        producer: "scheduling",
        subject: job.id,
      });

      return jobListingDetailSchema.parse(job);
    });

    app.get("/internal/bookings/:subject", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);

      if (!parsedSubject.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid subject is required.",
        });
      }

      const items = await listBookingsForSubject(parsedSubject.data.subject);

      return bookingListResponseSchema.parse({
        items: items.map((booking) =>
          bookingDetailSchema
            .omit({ lastUpdatedAt: true, requestedAt: true })
            .parse(booking),
        ),
        total: items.length,
      });
    });

    app.get(
      "/internal/bookings/:subject/:bookingId",
      async (request, reply) => {
        const parsedParams = bookingParamsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid subject and booking id are required.",
          });
        }

        const booking = await getBookingByIdForSubject(
          parsedParams.data.subject,
          parsedParams.data.bookingId,
        );

        if (!booking) {
          return reply.code(404).send({
            code: "BOOKING_NOT_FOUND",
            message: "No booking was found for the requested id.",
          });
        }

        return bookingDetailSchema.parse(booking);
      },
    );

    app.patch(
      "/internal/bookings/:subject/:bookingId",
      async (request, reply) => {
        const parsedParams = bookingParamsSchema.safeParse(request.params);
        const parsedBody = bookingStatusUpdateInputSchema.safeParse(
          request.body,
        );

        if (!parsedParams.success || !parsedBody.success) {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "A valid booking id and status payload are required.",
          });
        }

        const booking = await updateBookingStatusBySubject(
          parsedParams.data.subject,
          parsedParams.data.bookingId,
          parsedBody.data,
        );

        if (!booking.ok) {
          return reply.code(booking.statusCode).send({
            code: booking.code,
            message: booking.message,
          });
        }

        if (booking.data.status === "accepted") {
          await publishDomainEvent({
            name: "scheduling.booking.confirmed",
            payload: {
              bookingId: booking.data.id,
              clinicId: booking.data.clinicId,
              jobId: booking.data.jobId,
              professionalId: booking.data.professionalId,
              status: booking.data.status,
            },
            producer: "scheduling",
            subject: booking.data.id,
          });
        }

        return bookingDetailSchema.parse(booking.data);
      },
    );

    app.post("/internal/bookings/:subject", async (request, reply) => {
      const parsedSubject = subjectParamsSchema.safeParse(request.params);
      const parsedBody = bookingRequestInputSchema.safeParse(request.body);

      if (!parsedSubject.success || !parsedBody.success) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "A valid subject and booking request payload are required.",
        });
      }

      const booking = await requestBookingBySubject(
        parsedSubject.data.subject,
        parsedBody.data,
      );

      if (!booking.ok) {
        return reply.code(booking.statusCode).send({
          code: booking.code,
          message: booking.message,
        });
      }

      publishDomainEvent({
        name: "scheduling.booking.requested",
        payload: {
          clinicId: booking.data.clinicId,
          jobId: booking.data.jobId,
          professionalId: booking.data.professionalId,
          status: booking.data.status,
        },
        producer: "scheduling",
        subject: booking.data.id,
      }).catch((error: unknown) => {
        request.log.warn(
          { error, bookingId: booking.data.id },
          "Failed to publish booking requested event after persisting booking.",
        );
      });

      return bookingDetailSchema.parse(booking.data);
    });
  },
});
