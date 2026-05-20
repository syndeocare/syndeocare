import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "profiles",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.profiles,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "profiles",
      responsibility: "Professional and user profile lifecycle management.",
    }));
  },
});
