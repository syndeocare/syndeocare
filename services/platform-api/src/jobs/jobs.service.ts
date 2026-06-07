import { getJobListingById, listJobListings } from "@repo/persistence";
import { Injectable, NotFoundException } from "@nestjs/common";
import { getOrSetJsonCache } from "@repo/cache";
import { ListJobsQueryDto } from "./dto/list-jobs-query.dto.js";

@Injectable()
export class JobsService {
  private readonly cacheTtlSeconds = Number(
    process.env.CACHE_TTL_SECONDS ?? 60,
  );

  async listJobs(query: ListJobsQueryDto) {
    const items = await getOrSetJsonCache(
      `platform-api:jobs:list:${JSON.stringify(query)}`,
      () => listJobListings(query),
      this.cacheTtlSeconds,
    );

    return {
      items,
      total: items.length,
    };
  }

  async getJobById(jobId: string) {
    const job = await getOrSetJsonCache(
      `platform-api:jobs:item:${jobId}`,
      () => getJobListingById(jobId),
      this.cacheTtlSeconds,
    );

    if (!job) {
      throw new NotFoundException("Job listing not found.");
    }

    return job;
  }
}
