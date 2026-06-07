import {
  professionalProfileListResponseSchema,
  professionalProfileSummarySchema,
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
import { ListProfilesQueryDto } from "./dto/list-profiles-query.dto.js";
import { ProfilesService } from "./profiles.service.js";

@ApiTags("profiles")
@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: "Browse professional profiles." })
  @ApiQuery({ name: "city", required: false, type: String })
  @ApiQuery({ name: "language", required: false, type: String })
  @ApiQuery({ name: "specialty", required: false, type: String })
  @ApiQuery({
    name: "verificationStatus",
    required: false,
    enum: ["not_started", "pending_review", "approved", "rejected"],
  })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      professionalProfileListResponseSchema,
      "ProfessionalProfileListResponse",
    ),
  })
  listProfiles(@Query() query: ListProfilesQueryDto) {
    return this.profilesService.listProfiles(query);
  }

  @Get(":profileId")
  @ApiOperation({ summary: "Read professional profile details." })
  @ApiParam({ name: "profileId", type: String })
  @ApiOkResponse({
    schema: buildSchemaFromZod(
      professionalProfileSummarySchema,
      "ProfessionalProfileSummary",
    ),
  })
  getProfileById(@Param("profileId") profileId: string) {
    return this.profilesService.getProfileById(profileId);
  }
}
