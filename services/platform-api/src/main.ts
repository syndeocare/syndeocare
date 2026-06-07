import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { AppModule } from "./app.module.js";

function parseCorsOrigins(rawValue?: string) {
  if (!rawValue || rawValue.trim().length === 0) {
    return true;
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );
  const configService = app.get(ConfigService);
  const docsPath = configService.get<string>("API_DOCS_PATH") ?? "docs";
  const host = configService.get<string>("HOST") ?? "0.0.0.0";
  const port = configService.get<number>("PORT") ?? 4300;
  const publicUrl = configService.get<string>("API_PUBLIC_URL");

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(cors, {
    origin: parseCorsOrigins(configService.get<string>("API_CORS_ORIGINS")),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.setGlobalPrefix("v1");

  const swaggerBuilder = new DocumentBuilder()
    .setTitle("SyndeoCare Platform API")
    .setDescription(
      "NestJS public API foundation for SyndeoCare clients and future service integrations.",
    )
    .setVersion("1.0.0")
    .addTag("platform")
    .addTag("health")
    .addTag("profiles")
    .addTag("clinics")
    .addTag("jobs")
    .addTag("subject");

  if (publicUrl) {
    swaggerBuilder.addServer(publicUrl);
  }

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerBuilder.build(),
  );
  SwaggerModule.setup(docsPath, app, swaggerDocument, {
    jsonDocumentUrl: `${docsPath}/json`,
    useGlobalPrefix: true,
  });

  await app.listen(port, host);
}

void bootstrap();
