
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "schema.graphql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        federation: true,
        mappers: {
          Review: "../repositories/Review.repository#ReviewModel",
        },
        contextType: "../context#ResolverContext",
      }
    }
  }
};

export default config;
