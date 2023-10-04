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
import {
  ReviewModel,
  ReviewRepository,
} from "./repositories/Review.repository";
import type { APIGatewayProxyEventV2WithLambdaAuthorizer } from "aws-lambda";
import { formatDistanceToNow } from "date-fns";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Product: {
    reviews: async (product, { first, after }, ctx) => {
      const reviews: ReviewModel[] = [];
      const iterator = ctx.repositories.review.loadAll(
        product.id,
        after ?? undefined
      );

      for await (const review of iterator) {
        reviews.push(review);
        if (first && reviews.length >= first) {
          break;
        }
      }

      const { done } = await iterator.next();

      return {
        edges: reviews.map((review) => ({
          cursor: review.sk,
          node: review,
        })),
        pageInfo: {
          endCursor: reviews.at(-1)?.sk ?? null,
          hasNextPage: !done,
        },
      };
    },
  },
  Review: {
    __resolveReference: async (review, ctx) => {
      const { id } = review as unknown as { id: string };
      const [productId, reviewId] = Buffer.from(id, "base64url")
        .toString()
        .split(":");
      const result = await ctx.repositories.review.load(productId, reviewId);
      return result;
    },
    id: (review, _, ctx) => {
      const id = [
        ctx.repositories.review.getProductIdFromPk(review.pk),
        review.sk,
      ].join(":");
      return Buffer.from(id).toString("base64url");
    },
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
      const review = await ctx.repositories.review.create({
        body: args.review.body,
        productId: id,
        rating: args.review.rating,
        userId: ctx.session.userId,
        createdAt: new Date().toISOString(),
      });
      return review;
    },
  },
  DateTime: {
    iso8601: (date) => date,
    distanceToNow: (date) => {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
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
          review: new ReviewRepository(ddbClient),
        },
        session: {
          userId: event.requestContext.authorizer.lambda.userId,
        },
      };
    },
  }
);
