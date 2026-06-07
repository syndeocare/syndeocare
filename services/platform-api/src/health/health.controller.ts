import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { DatabaseHealthIndicator } from "./database.health.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly database: DatabaseHealthIndicator,
  ) {}

  @Get("live")
  @ApiOkResponse({
    description: "Liveness probe for the NestJS public API service.",
  })
  live() {
    return {
      service: "platform-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  @HealthCheck()
  @ApiOkResponse({
    description:
      "Readiness probe that checks memory and database connectivity.",
  })
  ready() {
    return this.health.check([
      () => this.database.isHealthy("database"),
      () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024),
    ]);
  }
}
