import { z } from "zod";

export const env = z.object({
  DDB_TABLE_NAME: z.string(),
  AUTHENTICATION_FUNCTION_NAME: z.string(),
}).parse(process.env);