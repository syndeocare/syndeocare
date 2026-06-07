import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { envValidationSchema } from "./config/env.validation.js";
import { HealthModule } from "./health/health.module.js";
import { PlatformModule } from "./platform/platform.module.js";
import { ProfilesModule } from "./profiles/profiles.module.js";
import { ClinicsModule } from "./clinics/clinics.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { SubjectModule } from "./subject/subject.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TerminusModule,
    HealthModule,
    PlatformModule,
    ProfilesModule,
    ClinicsModule,
    JobsModule,
    SubjectModule,
  ],
})
export class AppModule {}
