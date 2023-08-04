import { injectable } from "tsyringe";
import { ResourceManager } from "./ResourceManager";
import { z } from "zod";
import { GraphService } from "../services/GraphService";
import { GraphType } from "../gql/graphql";
import { SubgraphService } from "../services/SubgraphService";
import * as crypto from "crypto";

const SubgraphPropertiesSchema = z.object({
  graphId: z.string(),
  variantName: z.string(),
  subgraphName: z.string(),
  sdl: z.string(),
  url: z.string(),
});

const SubgraphDataSchema = z.object({});

@injectable()
export class SubgraphResourceManager extends ResourceManager<
  typeof SubgraphPropertiesSchema,
  typeof SubgraphDataSchema
> {
  constructor(private subgraphService: SubgraphService) {
    super(SubgraphPropertiesSchema, SubgraphDataSchema, {
      id: {
        maxLength: 64,
      },
      create: async (event) => {
        const revision = crypto
          .createHash("sha256")
          .update(event.ResourceProperties.sdl)
          .digest("hex")
          .slice(0, 16);
        await this.subgraphService.publishSubgraph(
          event.ResourceProperties.graphId,
          event.ResourceProperties.subgraphName,
          event.ResourceProperties.variantName,
          revision,
          event.ResourceProperties.sdl,
          event.ResourceProperties.url
        );
        return {
          Data: {},
        };
      },
      update: async (event) => {
        const o = event.OldResourceProperties!;
        const n = event.ResourceProperties;

        if (
          o.graphId !== n.graphId ||
          o.subgraphName !== n.subgraphName ||
          o.variantName !== n.variantName
        ) {
          await this.subgraphService.deleteSubgraph(
            o.graphId,
            o.subgraphName,
            o.variantName
          );
        }
        await this.subgraphService.publishSubgraph(
          n.graphId,
          n.subgraphName,
          n.variantName,
          crypto
            .createHash("sha256")
            .update(n.sdl)
            .digest("hex")
            .slice(0, 16),
          n.sdl,
          n.url
        );

        return {
          Data: {},
        };
      },
      delete: async (event) => {
        await this.subgraphService.deleteSubgraph(
          event.ResourceProperties.graphId,
          event.ResourceProperties.subgraphName,
          event.ResourceProperties.variantName
        );
      },
    });
  }
}
