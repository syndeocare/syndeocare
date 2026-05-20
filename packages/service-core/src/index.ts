import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import {
  domainEventCatalog,
  type EventName,
  type ServiceName,
} from "@repo/contracts";

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_NODE_ENV = "development";
const DEFAULT_PORT = 4000;

type ServiceBootstrapOptions = {
  serviceName: ServiceName;
  version: string;
  register?: (app: FastifyInstance) => Promise<void> | void;
  serviceEvents?: readonly EventName[];
};

export async function createServiceApp(options: ServiceBootstrapOptions) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, { origin: true });
  await app.register(swagger, {
    openapi: {
      info: {
        title: `${options.serviceName} API`,
        version: options.version,
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.get("/health", async () => ({
    service: options.serviceName,
    status: "ok",
    version: options.version,
    environment: process.env.NODE_ENV ?? DEFAULT_NODE_ENV,
  }));

  app.get("/ready", async () => ({
    service: options.serviceName,
    ready: true,
  }));

  app.get("/events", async () => ({
    service: options.serviceName,
    events: options.serviceEvents ?? domainEventCatalog[options.serviceName],
  }));

  if (options.register) {
    await options.register(app);
  }

  return app;
}

export async function startService(options: ServiceBootstrapOptions) {
  const app = await createServiceApp(options);
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  const host = process.env.HOST ?? DEFAULT_HOST;
  await app.listen({ port, host });
  return app;
}
