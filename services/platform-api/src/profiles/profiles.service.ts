import {
  getProfessionalProfileById,
  listProfessionalProfiles,
} from "@repo/persistence";
import { Injectable, NotFoundException } from "@nestjs/common";
import { getOrSetJsonCache } from "@repo/cache";
import { ListProfilesQueryDto } from "./dto/list-profiles-query.dto.js";

@Injectable()
export class ProfilesService {
  private readonly cacheTtlSeconds = Number(
    process.env.CACHE_TTL_SECONDS ?? 60,
  );

  async listProfiles(query: ListProfilesQueryDto) {
    return getOrSetJsonCache(
      `platform-api:profiles:list:${JSON.stringify(query)}`,
      () => listProfessionalProfiles(query),
      this.cacheTtlSeconds,
    );
  }

  async getProfileById(profileId: string) {
    const profile = await getOrSetJsonCache(
      `platform-api:profiles:item:${profileId}`,
      () => getProfessionalProfileById(profileId),
      this.cacheTtlSeconds,
    );

    if (!profile) {
      throw new NotFoundException("Professional profile not found.");
    }

    return profile;
  }
}
