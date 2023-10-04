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
import {
  ProductModel,
  ProductRepository,
} from "./repositories/Product.repository";
import { ResolverContext } from "./context";
import { ddbClient } from "./ddb";
import { APIGatewayProxyEventV2WithLambdaAuthorizer } from "aws-lambda";
import { formatDistanceToNow } from "date-fns";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Query: {
    products: async (_, { limit, offset }, ctx) => {
      const products: ProductModel[] = [];
      const iterator = ctx.repositories.product.loadAll();

      for (let i = 0; i < (offset ?? 0); i++) {
        const { done } = await iterator.next();
        if (done) {
          return [];
        }
      }

      for await (const product of iterator) {
        products.push(product);
        if (limit && products.length >= limit) {
          break;
        }
      }
      return products;
    },
    product: async (_, { id }, ctx) => {
      return await ctx.repositories.product.load(id);
    },
  },
  Mutation: {
    createProduct: async (_, { product }, ctx) => {
      if (ctx.session.userId === null) {
        throw new Error("Unauthorized");
      }
      return await ctx.repositories.product.create({
        ...product,
        createdByUserId: ctx.session.userId,
        createdAt: new Date().toISOString(),
      });
    },
    product: async (_, { id }, ctx) => {
      return await ctx.repositories.product.load(id);
    },
  },
  ProductMutation: {
    __resolveReference: async (product, ctx) => {
      // Entry point reference type is improper in codegen when using custom mapper types
      // So, here we are casting to unknown and then to the proper type
      // See https://github.com/dotansimha/graphql-code-generator/issues/3207
      const reference = product as unknown as { id: string };
      return await ctx.repositories.product.load(reference.id);
    },
    id: (product, _, ctx) => ctx.repositories.product.getId(product),
    update: async (product, args, ctx) => {
      if (
        ctx.session.userId === null ||
        product.createdByUserId !== ctx.session.userId
      ) {
        throw new Error("Unauthorized");
      }
      product.price = args.product.price;
      product.name = args.product.name;
      await ctx.repositories.product.update(product);
      return product;
    },
    delete: async (product, args, ctx) => {
      if (
        ctx.session.userId === null ||
        product.createdByUserId !== ctx.session.userId
      ) {
        throw new Error("Unauthorized");
      }
      await ctx.repositories.product.delete(product);
      return true;
    },
  },
  Product: {
    __resolveReference: async (product, ctx) => {
      // Entry point reference type is improper in codegen when using custom mapper types
      // So, here we are casting to unknown and then to the proper type
      // See https://github.com/dotansimha/graphql-code-generator/issues/3207
      const reference = product as unknown as { id: string };
      return await ctx.repositories.product.load(reference.id);
    },
    id: (product, _, ctx) => ctx.repositories.product.getId(product),
    name: (product) => product.name,
    price: (product) => product.price,
    createdBy: (product) => {
      return {
        __typename: "User",
        id: product.createdByUserId,
      };
    },
  },
  DateTime: {
    iso8601: (date) => date,
    distanceToNow: (date) => {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    },
  },
  Currency: {
    amount: (amount) => amount,
    formatted: (amount, { precision }) => {
      return Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: precision,
      }).format(amount / 100);
    },
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
          product: new ProductRepository(ddbClient),
        },
        session: {
          userId: event.requestContext.authorizer.lambda.userId,
        },
      };
    },
  }
);
