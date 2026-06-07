import { Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator } from "@nestjs/terminus";
import { sql } from "drizzle-orm";
import { getDb } from "@repo/persistence";

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  async isHealthy(key: string) {
    try {
      await getDb().execute(sql`select 1`);

      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        "Database ping failed.",
        this.getStatus(key, false, {
          message:
            error instanceof Error ? error.message : "Unknown database error",
        }),
      );
    }
  }
}
