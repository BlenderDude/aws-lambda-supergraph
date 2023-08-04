import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import { parse } from "graphql";
import * as fs from "fs";
import * as path from "path";

const products = [{
  id: "1",
  name: "Product 1",
  price: 1000,
}, {
  id: "2",
  name: "Product 2",
  price: 3000,
}]

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    products: () => products,
  },
  Product: {
    __resolveReference: (product: {id: string}) => products.find(({ id }) => id === product.id),
  }
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
