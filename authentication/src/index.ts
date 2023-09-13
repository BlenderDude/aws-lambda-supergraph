import type { Handler } from "aws-lambda";
import z from "zod";
import jwt from "jsonwebtoken";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const payloadSchema = z.object({
  userId: z.string(),
  name: z.string(),
});

const eventSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("verify"),
    token: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/),
  }),
  z.strictObject({
    action: z.literal("create"),
    payload: payloadSchema,
  }),
]);

function verifyToken(token: string, secret: string) {
  return jwt.verify(token, secret) as z.output<typeof payloadSchema>;
}

function signToken(payload: z.output<typeof payloadSchema>, secret: string) {
  return jwt.sign(payload, secret);
}

async function getSecret() {
  const secretArn = z.string().parse(process.env.JWT_SECRET_ARN);
  const client = new SecretsManagerClient({});
  const command = new GetSecretValueCommand({
    SecretId: secretArn,
  });
  const { SecretString } = await client.send(command);
  return SecretString!;
}

export const handler: Handler<unknown> = async (e) => {
  const secret = await getSecret();
  const event = eventSchema.parse(e);
  switch (event.action) {
    case "verify": {
      try {
        const payload = verifyToken(event.token, secret);
        return {
          type: "verify",
          success: true,
          payload,
        };
      } catch {
        return {
          type: "verify",
          success: false,
        };
      }
    }
    case "create": {
      const payload = payloadSchema.parse(event.payload);
      const token = signToken(payload, secret);
      return {
        type: "create",
        token,
      };
    }
  }
};
