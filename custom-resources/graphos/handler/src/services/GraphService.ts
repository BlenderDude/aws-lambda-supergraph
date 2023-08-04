import { inject, injectable } from "tsyringe";
import { ApolloRequestService } from "./ApolloRequestService";
import { graphql } from "../gql";
import { GraphType } from "../gql/graphql";
import { SubgraphService } from "./SubgraphService";
import * as crypto from "crypto";

export interface GraphProps {
  id: string;
  title: string;
  hiddenFromUninvitedNonAdmin: boolean;
  graphType: GraphType;
  variants: Record<string, {
    subgraphs: Record<string, {
      sdl: string;
      url: string;
    }>;
  }>;
}

@injectable()
export class GraphService {
  constructor(private apolloRequestService: ApolloRequestService, private subgraphService: SubgraphService) {}

  public async createGraph(
    properties: GraphProps,
    accountId?: string
  ): Promise<void> {
    if (accountId === undefined) {
      accountId = await this.apolloRequestService.getPrimaryAccountId();
    }
    const data = await this.apolloRequestService.request(
      graphql(`
        mutation CreateGraph(
          $accountId: ID!
          $graphType: GraphType!
          $hiddenFromUninvitedNonAdmin: Boolean!
          $createGraphId: ID!
          $title: String!
        ) {
          account(id: $accountId) {
            createGraph(
              graphType: $graphType
              hiddenFromUninvitedNonAdmin: $hiddenFromUninvitedNonAdmin
              id: $createGraphId
              title: $title
            ) {
              __typename
              ... on Service {
                id
              }
              ... on GraphCreationError {
                message
              }
            }
          }
        }
      `),
      {
        accountId,
        graphType: GraphType.CloudSupergraph,
        hiddenFromUninvitedNonAdmin: properties.hiddenFromUninvitedNonAdmin,
        createGraphId: properties.id,
        title: properties.title,
      }
    );

    if (
      data &&
      data.account?.createGraph?.__typename === "GraphCreationError"
    ) {
      throw new Error(data.account.createGraph.message);
    }

    if (!data || data.account?.createGraph?.__typename !== "Service") {
      throw new Error(
        `Could not create graph: Response was ${JSON.stringify(data)}`
      );
    }

    const graphId = data.account.createGraph.id;

    await this.subgraphService.synchronizeSubgraphs(
      graphId,
      crypto.randomBytes(8).toString("hex"),
      properties.variants
    );
  }

  public async updateGraph(
    properties: GraphProps,
  ): Promise<void> {
    await this.apolloRequestService.request(
      graphql(`
        mutation UpdateGraph(
          $graphId: ID!
          $title: String!
        ) {
          graph(id: $graphId) {
            updateTitle(title: $title) {
              __typename
            }
          }
        }
      `),
      {
        graphId: properties.id,
        title: properties.title,
      }
    )

    await this.subgraphService.synchronizeSubgraphs(
      properties.id,
      crypto.randomBytes(8).toString("hex"),
      properties.variants
    );
  }

  public async deleteGraph(graphId: string): Promise<void> {
    await this.apolloRequestService.request(
      graphql(`
        mutation DeleteGraph($graphId: ID!) {
          service(id: $graphId) {
            delete
          }
        }
      `),
      {
        graphId,
      }
    );
  }
}
