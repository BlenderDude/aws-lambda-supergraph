import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from "@as-integrations/aws-lambda";
import { parse } from "graphql";
import * as fs from "fs";
import * as path from "path";

const users = [{
  id: "1",
  name: "Alice",
}, {
  id: "2",
  name: "Bob",
}, {
  id: "3",
  name: "Daniel Abdelsamed",
}]

// A map of functions which return data for the schema.
const resolvers = {
  User: {
    __resolveReference: (user: {id: string}) => users.find(({ id }) => id === user.id),
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
