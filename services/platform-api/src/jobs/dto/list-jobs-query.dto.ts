import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class ListJobsQueryDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(["temporary_shift", "permanent_role", "contract"])
  employmentType?: "temporary_shift" | "permanent_role" | "contract";

  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) {
      return true;
    }

    if (value === "false" || value === false) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  verificationRequired?: boolean;
}
