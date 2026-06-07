import { IsOptional, IsString } from "class-validator";

export class CreateBookingRequestDto {
  @IsString()
  jobId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
