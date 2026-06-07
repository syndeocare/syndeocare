import {
  jobListingDetailSchema,
  jobListingListResponseSchema,
} from "@repo/contracts";
import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { buildSchemaFromZod } from "../common/swagger.js";
import { ListJobsQueryDto } from "./dto/list-jobs-query.dto.js";
import { JobsService } from "./jobs.service.js";

@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: "Browse open jobs and shifts." })
  @ApiQuery({ name: "specialty", required: false, type: String })
  @ApiQuery({ name: "city", required: false, type: String })
  @ApiQuery({
    name: "employmentType",
    required: false,
    enum: ["temporary_shift", "permanent_role", "contract"],
  })
  @ApiQuery({ name: "verificationRequired", required: false, type: Boolean })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      jobListingListResponseSchema,
      "JobListingListResponse",
    ),
  })
  listJobs(@Query() query: ListJobsQueryDto) {
    return this.jobsService.listJobs(query);
  }

  @Get(":jobId")
  @ApiOperation({ summary: "Read job or shift details." })
  @ApiParam({ name: "jobId", type: String })
  @ApiOkResponse({
    schema: buildSchemaFromZod(jobListingDetailSchema, "JobListingDetail"),
  })
  getJobById(@Param("jobId") jobId: string) {
    return this.jobsService.getJobById(jobId);
  }
}
