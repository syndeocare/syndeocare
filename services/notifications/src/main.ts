import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "notifications",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.notifications,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "notifications",
      responsibility: "Email, push, and workflow notification fan-out.",
    }));
  },
});
