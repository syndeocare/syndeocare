import { getClinicProfileById, listClinicProfiles } from "@repo/persistence";
import { Injectable, NotFoundException } from "@nestjs/common";
import { getOrSetJsonCache } from "@repo/cache";
import { ListClinicsQueryDto } from "./dto/list-clinics-query.dto.js";

@Injectable()
export class ClinicsService {
  private readonly cacheTtlSeconds = Number(
    process.env.CACHE_TTL_SECONDS ?? 60,
  );

  async listClinics(query: ListClinicsQueryDto) {
    return getOrSetJsonCache(
      `platform-api:clinics:list:${JSON.stringify(query)}`,
      () => listClinicProfiles(query),
      this.cacheTtlSeconds,
    );
  }

  async getClinicById(clinicId: string) {
    const clinic = await getOrSetJsonCache(
      `platform-api:clinics:item:${clinicId}`,
      () => getClinicProfileById(clinicId),
      this.cacheTtlSeconds,
    );

    if (!clinic) {
      throw new NotFoundException("Clinic profile not found.");
    }

    return clinic;
  }
}
