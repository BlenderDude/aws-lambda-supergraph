import type {
  Handler,
  APIGatewayRequestSimpleAuthorizerHandlerV2WithContext,
} from "aws-lambda";
import jwt from "jsonwebtoken";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import crypto from "crypto";

async function getSecret() {
  const secretArn = process.env.JWT_SECRET_ARN ?? "";
  const client = new SecretsManagerClient({});
  const command = new GetSecretValueCommand({
    SecretId: secretArn,
  });
  const { SecretString } = await client.send(command);
  return SecretString!;
}

function validateRouterToken(token: string, secret: string) {
  return crypto.timingSafeEqual(
    crypto.createHash("sha256").update(token).digest(),
    crypto.createHash("sha256").update(secret).digest()
  );
}

export const handler: APIGatewayRequestSimpleAuthorizerHandlerV2WithContext<{
  userId: string | null;
}> = async (e) => {
  const secret = await getSecret();

  if (!validateRouterToken(e.headers?.["X-Router-Token"] ?? "", secret)) {
    return {
      isAuthorized: false,
      context: {
        userId: null,
      },
    };
  }

  const [scheme, credentials] = e.headers?.Authorization?.split(" ") ?? [];

  if (scheme === "None") {
    return {
      isAuthorized: true,
      context: {
        userId: null,
      },
    };
  }

  if (scheme === "Bearer" && credentials) {
    try {
      const payload = jwt.verify(credentials, secret) as {
        userId: string;
      };

      return {
        isAuthorized: true,
        context: {
          userId: payload.userId,
        },
      };
    } catch {
      return {
        isAuthorized: true,
        context: {
          userId: null,
        },
      };
    }
  }

  return {
    isAuthorized: true,
    context: {
      userId: null,
    },
  };
};
