import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import { parse } from "graphql";
import * as fs from "fs";
import * as path from "path";

const reviews = [{
  id: "1",
  productId: "1",
  rating: 5,
  body: "This is a great product!",
  userId: "1",
}, {
  id: "2",
  productId: "1",
  rating: 1,
  body: "This is a terrible product!",
  userId: "2",
}, {
  id: "3",
  productId: "2",
  rating: 3,
  body: "This is an okay product!",
  userId: "3",
}]

// A map of functions which return data for the schema.
const resolvers = {
  Product: {
    reviews: (product: {id: string}) => reviews.filter(({ productId }) => productId === product.id),
  },
  Review: {
    __resolveReference: (review: {id: string}) => reviews.find(({ id }) => id === review.id),
    user: (review: {userId: string}) => ({ __typename: "User", id: review.userId }),
    product: (review: {productId: string}) => ({ __typename: "Product", id: review.productId }),
  },
};

// Set up Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: parse(
      fs.readFileSync(path.join(__dirname, "..", "schema.graphql"), "utf8")
    ),
    resolvers,
  }),
});

export default startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
