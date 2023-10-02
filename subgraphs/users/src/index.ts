import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import * as fs from "fs";
import { parse } from "graphql";
import * as path from "path";
import { ResolverContext } from "./context";
import { ddbClient } from "./ddb";
import { UserRepository } from "./repositories/User.repository";
import { env, getSecret } from "./env";
import { Resolvers } from "./generated/graphql";
import jwt from "jsonwebtoken";
import { APIGatewayProxyEventV2WithLambdaAuthorizer } from "aws-lambda";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Query: {
    viewer: async (_, __, ctx) => {
      if (ctx.session.userId === null) {
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
      const id = ctx.repositories.user.getUserId(user);
      const token = jwt.sign({ userId: id }, await getSecret());
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
    id: (user, __, ctx) => {
      return ctx.repositories.user.getUserId(user);
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
});

export default startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler<
    APIGatewayProxyEventV2WithLambdaAuthorizer<{
      userId: string | null;
    }>
  >(),
  {
    context: async ({ event }): Promise<ResolverContext> => {
      return {
        repositories: {
          user: new UserRepository(ddbClient),
        },
        session: {
          userId: event.requestContext.authorizer.lambda.userId,
        },
      };
    },
  }
);
