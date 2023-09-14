import { ApolloServerPlugin } from "@apollo/server";
import * as crypto from "crypto";

export const loggingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const id = crypto.randomBytes(8).toString("hex");
    console.log(`[${id}] Request started`);
    return {
      async willSendResponse() {
        console.log(`[${id}] Request finished`);
      },
      async didEncounterErrors(ctx) {
        for(const error of ctx.errors) {
          console.log(`[${id}] Request error encountered at [${error.path?.join(".")}] ${JSON.stringify(error.originalError)}`)
        }
      },
    }
  },
}
