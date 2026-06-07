import { getClinicProfileById, listClinicProfiles } from "@repo/persistence";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ListClinicsQueryDto } from "./dto/list-clinics-query.dto.js";

@Injectable()
export class ClinicsService {
  async listClinics(query: ListClinicsQueryDto) {
    return listClinicProfiles(query);
  }

  async getClinicById(clinicId: string) {
    const clinic = await getClinicProfileById(clinicId);

    if (!clinic) {
      throw new NotFoundException("Clinic profile not found.");
    }

    return clinic;
  }
}
