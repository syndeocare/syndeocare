import type { ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function buildSchemaFromZod(schema: ZodTypeAny, name: string): never {
  return zodToJsonSchema(schema, {
    name,
    target: "jsonSchema7",
    $refStrategy: "none",
  }) as never;
}
