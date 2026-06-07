import { IsIn, IsOptional, IsString } from "class-validator";

export class ListProfilesQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsIn(["not_started", "pending_review", "approved", "rejected"])
  verificationStatus?:
    | "not_started"
    | "pending_review"
    | "approved"
    | "rejected";
}
