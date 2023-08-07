import { injectable } from "tsyringe";
import { ApolloRequestService } from "./ApolloRequestService";
import { graphql } from "../gql";

@injectable()
export class SubgraphService {
  constructor(private apolloRequestService: ApolloRequestService) {}

  async synchronizeSubgraphs(
    graphId: string,
    revision: string,
    variants: Record<
      string,
      {
        subgraphs: Record<
          string,
          {
            sdl: string;
            url: string;
          }
        >;
      }
    >
  ) {
    const existing = await this.apolloRequestService.request(
      graphql(`
        query GetVariantsAndSubgraphs($graphId: ID!) {
          graph(id: $graphId) {
            variants {
              name
              subgraphs {
                name
                activePartialSchema {
                  sdl
                }
              }
            }
          }
        }
      `),
      {
        graphId,
      }
    );

    if (!existing.graph) {
      throw new Error(`Graph ${graphId} does not exist`);
    }

    const variantsToDelete: string[] = [];

    for (const variant of existing.graph.variants) {
      if (!variants[variant.name]) {
        variantsToDelete.push(variant.name);
      }
    }

    for (const variantToDelete of variantsToDelete) {
      try {
        await this.apolloRequestService.request(
          graphql(`
            mutation DeleteVariant($graphId: ID!, $graphVariant: String!) {
              graph(id: $graphId) {
                variant(name: $graphVariant) {
                  delete {
                    deleted
                  }
                }
              }
            }
          `),
          {
            graphId,
            graphVariant: variantToDelete,
          }
        );
      } catch {}
    }

    for (const [variantName, variant] of Object.entries(variants)) {
      const subgraphsToDelete: string[] = [];
      const existingSubgraphs =
        existing.graph.variants.find((v) => v.name === variantName)
          ?.subgraphs ?? [];
      for (const subgraph of existingSubgraphs) {
        if (!variant.subgraphs[subgraph.name]) {
          subgraphsToDelete.push(subgraph.name);
        }
      }
      for (const subgraphToDelete of subgraphsToDelete) {
        await this.apolloRequestService.request(
          graphql(`
            mutation DeleteSubgraphInVariant(
              $graphId: ID!
              $graphVariant: String!
              $name: String!
            ) {
              graph(id: $graphId) {
                removeImplementingServiceAndTriggerComposition(
                  graphVariant: $graphVariant
                  dryRun: false
                  name: $name
                ) {
                  didExist
                }
              }
            }
          `),
          {
            graphId,
            graphVariant: variantName,
            name: subgraphToDelete,
          }
        );
      }

      const subgraphsToPublish = Object.entries(variant.subgraphs)
        .filter(([name, subgraph]) => {
          const existingSubgraph = existingSubgraphs.find(
            (s) => s.name === name
          );
          return (
            !existingSubgraph ||
            existingSubgraph.activePartialSchema.sdl !== subgraph.sdl
          );
        })
        .map(([name, subgraph]) => ({
          name,
          sdl: subgraph.sdl,
          url: subgraph.url,
        }));

      if (subgraphsToPublish.length > 0) {
        await this.publishSubgraphs(
          graphId,
          variantName,
          revision,
          subgraphsToPublish
        );
      }
    }
  }

  async publishSubgraphs(
    graphId: string,
    variantName: string,
    revision: string,
    subgraphs: {
      name: string;
      sdl: string;
      url: string;
    }[]
  ) {
    await this.apolloRequestService.request(
      graphql(`
        mutation PublishSubgraphs(
          $graphId: ID!
          $graphVariant: String!
          $revision: String!
          $subgraphs: [PublishSubgraphsSubgraphInput!]!
        ) {
          graph(id: $graphId) {
            publishSubgraphs(
              graphVariant: $graphVariant
              revision: $revision
              subgraphInputs: $subgraphs
            ) {
              errors {
                code
              }
            }
          }
        }
      `),
      {
        graphId,
        graphVariant: variantName,
        revision,
        subgraphs: subgraphs.map((subgraph) => ({
          name: subgraph.name,
          activePartialSchema: {
            sdl: subgraph.sdl,
          },
          url: subgraph.url,
        })),
      }
    );
  }

  async publishSubgraph(
    graphId: string,
    variantName: string,
    subgraphName: string,
    revision: string,
    sdl: string,
    url: string
  ) {
    await this.apolloRequestService.request(
      graphql(`
        mutation PublishSubgraph(
          $graphId: ID!
          $graphVariant: String!
          $name: String!
          $revision: String!
          $activePartialSchema: PartialSchemaInput!
          $url: String
        ) {
          graph(id: $graphId) {
            publishSubgraph(
              graphVariant: $graphVariant
              name: $name
              revision: $revision
              activePartialSchema: $activePartialSchema
              url: $url
            ) {
              errors {
                code
              }
            }
          }
        }
      `),
      {
        graphId,
        name: subgraphName,
        graphVariant: variantName,
        revision,
        activePartialSchema: {
          sdl,
        },
        url,
      }
    );
  }

  async deleteSubgraph(
    graphId: string,
    subgraphName: string,
    variantName: string
  ) {
    try {
      await this.apolloRequestService.request(
        graphql(`
          mutation DeleteSubgraph(
            $graphId: ID!
            $name: String!
            $variant: String!
          ) {
            graph(id: $graphId) {
              removeImplementingServiceAndTriggerComposition(
                graphVariant: $variant
                dryRun: false
                name: $name
              ) {
                didExist
              }
            }
          }
        `),
        {
          graphId,
          name: subgraphName,
          variant: variantName,
        }
      );
    } catch {}
  }
}
