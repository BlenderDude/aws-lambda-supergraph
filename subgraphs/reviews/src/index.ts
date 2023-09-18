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
import { ReviewRepository } from "./repositories/Review.repository";
import { SessionManager, loggingPlugin } from "@app/shared";
import { env } from "./env";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Product: {
    reviews: async (product, _, ctx) => {
      return await ctx.repositories.review.loadAllReviews(product.id);
    },
  },
  Review: {
    id: (review, _, ctx) => review.pk + ":" + ctx.repositories.review.convertSkToId(review.sk),
    body: (review) => review.body,
    product: (review) => {
      return { __typename: "Product", id: review.productId } as any;
    },
    rating: (review) => review.rating,
    user: (review) => {
      return { __typename: "User", id: review.userId };
    },
  },
  ProductMutation: {
    addReview: async ({ id }, args, ctx) => {
      if (!ctx.session?.userId) {
        throw new Error("You must be logged in to add a review");
      }
      const review = await ctx.repositories.review.createReview({
        body: args.review.body,
        productId: id,
        rating: args.review.rating,
        userId: ctx.session.userId,
      });
      return review;
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
  plugins: [loggingPlugin],
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
          review: new ReviewRepository(ddbClient),
        },
        session,
      };
    },
  }
);
