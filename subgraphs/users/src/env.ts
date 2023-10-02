import { z } from "zod";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export const env = z
  .object({
    JWT_SECRET_ARN: z.string(),
    DDB_TABLE_NAME: z.string(),
  })
  .parse(process.env);

export async function getSecret() {
  const client = new SecretsManagerClient({});
  const command = new GetSecretValueCommand({
    SecretId: env.JWT_SECRET_ARN,
  });
  const { SecretString } = await client.send(command);
  return SecretString!;
}
