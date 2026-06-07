import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { platformMetadataSchema } from "@repo/contracts";
import { buildSchemaFromZod } from "../common/swagger.js";
import { PlatformService } from "./platform.service.js";

@ApiTags("platform")
@Controller()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get()
  @ApiOperation({
    summary: "Read platform API metadata and the current route catalog.",
  })
  @ApiOkResponse({
    schema: buildSchemaFromZod(platformMetadataSchema, "PlatformMetadata"),
  })
  index() {
    return this.platformService.getMetadata();
  }
}
