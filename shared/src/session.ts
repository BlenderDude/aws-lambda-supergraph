import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

type Payload =
  | {
      action: "verify";
      token: string;
    }
  | {
      action: "create";
      payload: {
        userId: string;
        name: string;
      };
    };

type Result =
  | {
      type: "verify";
      success: true;
      payload: Session;
    }
  | {
      type: "verify";
      success: false;
    }
  | {
      type: "create";
      token: string;
    }
  | {
      type: "error";
      message: string;
    };

export type Session = {
  userId: string;
  name: string;
};

export class SessionManager {
  private client = new LambdaClient({});

  constructor(private authenticationFunctionName: string) {}

  async createSession(userId: string, name: string) {
    const result = await this.invokeAuthenticator({
      action: "create",
      payload: {
        userId,
        name,
      },
    });

    if (result.type === "error") {
      throw new Error(result.message);
    }

    return result.token;
  }

  async verifySession(token: string): Promise<Session> {
    const result = await this.invokeAuthenticator({
      action: "verify",
      token,
    });

    if (result.type === "error") {
      throw new Error(result.message);
    }

    if (!result.success) {
      throw new Error("Invalid session");
    }

    return result.payload;
  }

  async loadSessionFromHeaders(
    headers: Record<string, string | undefined>
  ): Promise<Session | null> {
    const token = headers.authorization?.split(" ")[1];
    if (!token) {
      return null;
    }
    try {
      return await this.verifySession(token);
    } catch {
      return null;
    }
  }

  private async invokeAuthenticator<P extends Payload>(
    payload: P
  ): Promise<Extract<Result, { type: P["action"] } | { type: "error" }>> {
    const invokeResult = await this.client.send(
      new InvokeCommand({
        FunctionName: this.authenticationFunctionName,
        Payload: JSON.stringify(payload),
      })
    );

    if (invokeResult.FunctionError) {
      throw new Error(invokeResult.FunctionError);
    }

    return JSON.parse(invokeResult.Payload?.transformToString() ?? "");
  }
}
