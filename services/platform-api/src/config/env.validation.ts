import Joi from "joi";

export const envValidationSchema = Joi.object({
  API_CORS_ORIGINS: Joi.string().allow("").optional(),
  API_DOCS_PATH: Joi.string().default("docs"),
  API_PUBLIC_URL: Joi.string().uri().optional(),
  CACHE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  DATABASE_URL: Joi.string().min(1).required(),
  HOST: Joi.string()
    .hostname()
    .allow("0.0.0.0", "127.0.0.1")
    .default("0.0.0.0"),
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(4300),
  REDIS_URL: Joi.string().uri().optional(),
});
