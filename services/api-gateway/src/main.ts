import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "api-gateway",
  version: "0.1.0",
  serviceEvents: domainEventCatalog["api-gateway"],
  register(app) {
    app.get("/v1", async () => ({
      message: "SyndeoCare API Gateway",
      upstreamServices: [
        "identity",
        "profiles",
        "clinics",
        "scheduling",
        "messaging",
        "notifications",
      ],
      apiVersion: "v1",
    }));
  },
});
