import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  handlers,
  startServerAndCreateLambdaHandler,
} from "@as-integrations/aws-lambda";
import * as fs from "fs";
import { parse } from "graphql";
import * as path from "path";
import { ddbClient } from "./ddb";
import { Resolvers } from "./generated/graphql";
import { ProductLoader } from "./loader/ProductLoader";

// A map of functions which return data for the schema.
const resolvers: Resolvers = {
  Query: {
    products: async () => {
      const loader = new ProductLoader(ddbClient);
      return await loader.loadAll();
    },
    product: async (_, { id }) => {
      const loader = new ProductLoader(ddbClient);
      return await loader.load(id);
    },
  },
  Mutation: {
    createProduct: async (_, { product }) => {
      const loader = new ProductLoader(ddbClient);
      return await loader.create(product);
    },
    product: async (_, { id }) => {
      const loader = new ProductLoader(ddbClient);
      return await loader.load(id);
    }
  },
  ProductMutation: {
    update: async (product, args) => {
      const loader = new ProductLoader(ddbClient);
      product.price = args.product.price;
      product.name = args.product.name;
      return await loader.save(product);
    },
    delete: async (product) => {
      const loader = new ProductLoader(ddbClient);
      await loader.delete(product);
      return true;
    },
  },
  Product: {
    __resolveReference: async (product: { id: string }) => {
      const loader = new ProductLoader(ddbClient);
      return await loader.load(product.id);
    },
    id: (product) => product.id,
    name: (product) => product.name,
    price: (product) => product.price,
  },
};

// Set up Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: parse(
      fs.readFileSync(path.join(__dirname, "..", "schema.graphql"), "utf8")
    ),
    resolvers: resolvers as any,
  }),
});

export default startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler()
);
