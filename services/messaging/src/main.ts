import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "messaging",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.messaging,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "messaging",
      responsibility: "Conversation, message delivery, and inbox workflows.",
    }));
  },
});
