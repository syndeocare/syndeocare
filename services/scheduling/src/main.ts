import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "scheduling",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.scheduling,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "scheduling",
      responsibility: "Shifts, bookings, and workforce scheduling workflows.",
    }));
  },
});
