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
import { ProductRepository } from "./repositories/Product.repository";
import { ResolverContext } from "./context";
import { ddbClient } from "./ddb";
import { SessionManager, loggingPlugin } from "@app/shared";
import { env } from "./env";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Query: {
    products: async (_, __, ctx) => {
      return await ctx.repositories.product.loadAllProducts();
    },
    product: async (_, { id }, ctx) => {
      return await ctx.repositories.product.loadProduct(id);
    },
  },
  Mutation: {
    createProduct: async (_, { product }, ctx) => {
      if (ctx.session === null) {
        throw new Error("Unauthorized");
      }
      return await ctx.repositories.product.createProduct({
        ...product,
        createdByUserId: ctx.session.userId,
      });
    },
    product: async (_, { id }, ctx) => {
      return await ctx.repositories.product.loadProduct(id);
    },
  },
  ProductMutation: {
    __resolveReference: async (product, ctx) => {
      // Entry point reference type is improper in codegen when using custom mapper types
      // So, here we are casting to unknown and then to the proper type
      // See https://github.com/dotansimha/graphql-code-generator/issues/3207
      const reference = product as unknown as { id: string };
      return await ctx.repositories.product.loadProduct(reference.id);
    },
    id: (product) => product.sk.toString(16),
    update: async (product, args, ctx) => {
      if (
        ctx.session === null ||
        product.createdByUserId !== ctx.session.userId
      ) {
        throw new Error("Unauthorized");
      }
      product.price = args.product.price;
      product.name = args.product.name;
      return await ctx.repositories.product.save(product);
    },
    delete: async (product, args, ctx) => {
      if (
        ctx.session === null ||
        product.createdByUserId !== ctx.session.userId
      ) {
        throw new Error("Unauthorized");
      }
      await ctx.repositories.product.delete(product.pk, product.sk);
      return true;
    },
  },
  Product: {
    __resolveReference: async (product, ctx) => {
      // Entry point reference type is improper in codegen when using custom mapper types
      // So, here we are casting to unknown and then to the proper type
      // See https://github.com/dotansimha/graphql-code-generator/issues/3207
      const reference = product as unknown as { id: string };
      return await ctx.repositories.product.loadProduct(reference.id);
    },
    id: (product) => product.sk.toString(16),
    name: (product) => product.name,
    price: (product) => product.price,
    createdBy: (product) => {
      return {
        __typename: "User",
        id: product.createdByUserId,
      };
    }
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
  plugins: [loggingPlugin],
});

export default startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: async ({ event }): Promise<ResolverContext> => {
      const sessionManager = new SessionManager(
        env.AUTHENTICATION_FUNCTION_NAME
      );
      const session = await sessionManager.loadSessionFromHeaders(
        event.headers
      );
      return {
        repositories: {
          product: new ProductRepository(ddbClient),
        },
        session,
      };
    },
  }
);
