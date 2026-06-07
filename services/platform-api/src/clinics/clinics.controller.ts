import {
  clinicProfileListResponseSchema,
  clinicProfileSummarySchema,
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
import { ListClinicsQueryDto } from "./dto/list-clinics-query.dto.js";
import { ClinicsService } from "./clinics.service.js";

@ApiTags("clinics")
@Controller("clinics")
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  @ApiOperation({ summary: "Browse clinic and facility profiles." })
  @ApiQuery({ name: "city", required: false, type: String })
  @ApiQuery({ name: "facilityType", required: false, type: String })
  @ApiQuery({
    name: "verificationStatus",
    required: false,
    enum: ["not_started", "pending_review", "approved", "rejected"],
  })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      clinicProfileListResponseSchema,
      "ClinicProfileListResponse",
    ),
  })
  listClinics(@Query() query: ListClinicsQueryDto) {
    return this.clinicsService.listClinics(query);
  }

  @Get(":clinicId")
  @ApiOperation({ summary: "Read clinic profile details." })
  @ApiParam({ name: "clinicId", type: String })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      clinicProfileSummarySchema,
      "ClinicProfileSummary",
    ),
  })
  getClinicById(@Param("clinicId") clinicId: string) {
    return this.clinicsService.getClinicById(clinicId);
  }
}
