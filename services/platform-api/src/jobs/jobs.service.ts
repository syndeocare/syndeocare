import { getJobListingById, listJobListings } from "@repo/persistence";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ListJobsQueryDto } from "./dto/list-jobs-query.dto.js";

@Injectable()
export class JobsService {
  async listJobs(query: ListJobsQueryDto) {
    const items = await listJobListings(query);

    return {
      items,
      total: items.length,
    };
  }

  async getJobById(jobId: string) {
    const job = await getJobListingById(jobId);

    if (!job) {
      throw new NotFoundException("Job listing not found.");
    }

    return job;
  }
}
