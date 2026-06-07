import {
  getProfessionalProfileById,
  listProfessionalProfiles,
} from "@repo/persistence";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ListProfilesQueryDto } from "./dto/list-profiles-query.dto.js";

@Injectable()
export class ProfilesService {
  async listProfiles(query: ListProfilesQueryDto) {
    return listProfessionalProfiles(query);
  }

  async getProfileById(profileId: string) {
    const profile = await getProfessionalProfileById(profileId);

    if (!profile) {
      throw new NotFoundException("Professional profile not found.");
    }

    return profile;
  }
}
