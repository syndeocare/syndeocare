import { domainEventCatalog } from "@repo/contracts";
import { startService } from "@repo/service-core";

void startService({
  serviceName: "identity",
  version: "0.1.0",
  serviceEvents: domainEventCatalog.identity,
  register(app) {
    app.get("/internal/context", async () => ({
      service: "identity",
      authProvider: "keycloak",
      responsibility:
        "OIDC, session validation, and access policy enforcement.",
    }));
  },
});
