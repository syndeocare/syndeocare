import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "clinics",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.clinics,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "clinics",
      responsibility: "Clinic and facility domain management.",
    }));
  },
});
