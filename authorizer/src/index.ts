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

function validateRouterToken(providedToken: string, secret: string) {
  try {
    const routerToken = crypto
      .createHmac("sha256", secret)
      .update("router-token")
      .digest();
    const providedTokenBuffer = Buffer.from(providedToken, "hex");
    if (providedTokenBuffer.length !== routerToken.length) {
      return false;
    }

    return crypto.timingSafeEqual(routerToken, providedTokenBuffer);
  } catch (e) {
    console.log(e);
    return false;
  }
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
