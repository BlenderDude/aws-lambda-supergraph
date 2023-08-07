import { injectable } from "tsyringe";
import { ApolloRequestService } from "./ApolloRequestService";
import { graphql } from "../gql";
import ms from "ms";

@injectable()
export class VariantService {
  constructor(private apolloRequestService: ApolloRequestService) {}

  async getUrl(
    graphId: string,
    graphVariant: string,
    maxWait: number = ms('5m')
  ): Promise<string> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const {graph} = await this.apolloRequestService.request(
        graphql(`
          query GetVariantUrl($graphId: ID!, $graphVariant: String!) {
            graph(id: $graphId) {
              variant(name: $graphVariant) {
                url
              }
            }
          }
        `),
        {
          graphId,
          graphVariant,
        }
      );
      if (graph?.variant?.url) {
        return graph.variant.url;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error(`Timed out waiting for variant ${graphVariant} of graph ${graphId} to be ready`);
  }
}
