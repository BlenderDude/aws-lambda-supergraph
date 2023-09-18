import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import * as fs from "fs";
import { parse } from "graphql";
import * as path from "path";
import { Resolvers } from "./generated/graphql";
import { ResolverContext } from "./context";
import { ddbClient } from "./ddb";
import { UserRepository } from "./repositories/User.repository";
import { SessionManager, loggingPlugin } from "@app/shared";
import { env } from "./env";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Query: {
    viewer: async (_, __, ctx) => {
      if (ctx.session === null) {
        return null;
      }
      return await ctx.repositories.user.loadUser(ctx.session.userId);
    },
  },
  Mutation: {
    createSession: async (_, { name }, ctx) => {
      const user = await ctx.repositories.user.createUser({
        name,
      });
      const token = await ctx.services.session.createSession(
        ctx.repositories.user.convertSkToId(user.sk),
        user.name
      );
      return token;
    },
  },
  User: {
    __resolveReference: async (user, ctx) => {
      // Entry point reference type is improper in codegen when using custom mapper types
      // So, here we are casting to unknown and then to the proper type
      // See https://github.com/dotansimha/graphql-code-generator/issues/3207
      const reference = user as unknown as { id: string };
      return await ctx.repositories.user.loadUser(reference.id);
    },
    id: (user) => {
      const buff = Buffer.alloc(8);
      buff.writeBigUInt64LE(BigInt(user.sk));
      return buff.toString('hex');
    },
    name: (user) => user.name,
  },
};

// Set up Apollo Server
const server = new ApolloServer<ResolverContext>({
  schema: buildSubgraphSchema({
    typeDefs: parse(
      fs.readFileSync(path.join(__dirname, "..", "schema.graphql"), "utf8")
    ),
    resolvers: resolvers as any,
  }),
  plugins: [
    loggingPlugin,
  ]
});

const sessionManager = new SessionManager(
  env.AUTHENTICATION_FUNCTION_NAME
);

export default startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: async ({ event }): Promise<ResolverContext> => {
      const session = await sessionManager.loadSessionFromHeaders(
        event.headers
      );
      return {
        repositories: {
          user: new UserRepository(ddbClient),
        },
        services: {
          session: sessionManager,
        },
        session,
      };
    },
  }
);
