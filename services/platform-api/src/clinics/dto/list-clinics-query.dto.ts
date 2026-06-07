import { IsIn, IsOptional, IsString } from "class-validator";

export class ListClinicsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  facilityType?: string;

  @IsOptional()
  @IsIn(["not_started", "pending_review", "approved", "rejected"])
  verificationStatus?:
    | "not_started"
    | "pending_review"
    | "approved"
    | "rejected";
}
