import {
  gatewayAuthConfigurationSchema,
  platformMetadataSchema,
  type PlatformMetadata,
} from "@repo/contracts";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { buildPlatformApiRouteCatalog } from "./route-catalog.js";
import { DEV_ACTOR_SUBJECT_HEADER } from "../common/current-subject.decorator.js";

@Injectable()
export class PlatformService {
  constructor(private readonly configService: ConfigService) {}

  getMetadata(): PlatformMetadata {
    const publicUrl = this.configService.get<string>("API_PUBLIC_URL");
    const routeBasePath = (() => {
      if (!publicUrl) {
        return "v1";
      }

      try {
        return new URL(publicUrl).pathname
          .replace(/^\/+/, "")
          .replace(/\/+$/, "");
      } catch {
        return "v1";
      }
    })();
    const auth = gatewayAuthConfigurationSchema.parse({
      mode: "development-bypass",
      configured: false,
      developmentHeaders: [DEV_ACTOR_SUBJECT_HEADER],
      issuer: undefined,
      audience: undefined,
      clientId: undefined,
      realm: undefined,
      jwksUri: undefined,
    });

    return platformMetadataSchema.parse({
      message:
        "SyndeoCare NestJS platform API is live and ready for web/mobile integration.",
      apiVersion: "v1",
      upstreamServices: [
        "identity",
        "profiles",
        "clinics",
        "scheduling",
        "notifications",
      ],
      productSurfaces: [
        "admin-web",
        "clinic-web",
        "clinic-mobile",
        "professional-mobile",
      ],
      auth,
      routes: buildPlatformApiRouteCatalog(routeBasePath),
      publicUrl,
    });
  }
}
