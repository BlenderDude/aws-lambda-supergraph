import { ApolloServer } from '@apollo/server';
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from '@as-integrations/aws-lambda';
import * as fs from 'fs';
import * as path from 'path';

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
  },
};

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs: fs.readFileSync(
    path.join(__dirname, '..', 'schema.graphql'),
    'utf8'
  ),
  resolvers,
});

export default startServerAndCreateLambdaHandler(
  server,
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
);