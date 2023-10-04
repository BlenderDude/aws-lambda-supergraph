import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "schema.graphql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        federation: true,
        mappers: {
          Product: "../repositories/Product.repository#ProductModel",
          ProductMutation: "../repositories/Product.repository#ProductModel",
          DateTime: "string",
          Currency: "number",
        },
        contextType: "../context#ResolverContext",
      },
    },
  },
};

export default config;
