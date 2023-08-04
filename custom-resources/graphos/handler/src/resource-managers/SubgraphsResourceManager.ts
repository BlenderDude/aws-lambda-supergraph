import { injectable } from "tsyringe";
import { ResourceManager } from "./ResourceManager";
import { z } from "zod";
import { GraphService } from "../services/GraphService";
import { GraphType } from "../gql/graphql";
import { SubgraphService } from "../services/SubgraphService";
import * as crypto from "crypto";

const SubgraphsPropertiesSchema = z.object({
  graphId: z.string(),
  variantName: z.string(),
  subgraphs: z.array(
    z.object({
      name: z.string(),
      sdl: z.string(),
      url: z.string(),
    })
  ),
});

const SubgraphsDataSchema = z.object({});

@injectable()
export class SubgraphsResourceManager extends ResourceManager<
  typeof SubgraphsPropertiesSchema,
  typeof SubgraphsDataSchema
> {
  constructor(private subgraphService: SubgraphService) {
    super(SubgraphsPropertiesSchema, SubgraphsDataSchema, {
      id: {
        maxLength: 64,
      },
      create: async (event) => {
        const revision = crypto
          .createHash("sha256")
          .update(
            event.ResourceProperties.subgraphs.reduce(
              (acc, subgraph) => acc + subgraph.sdl,
              ""
            )
          )
          .digest("hex")
          .slice(0, 16);
        await this.subgraphService.publishSubgraphs(
          event.ResourceProperties.graphId,
          event.ResourceProperties.variantName,
          revision,
          event.ResourceProperties.subgraphs.map((subgraph) => ({
            name: subgraph.name,
            sdl: subgraph.sdl,
            url: subgraph.url,
          }))
        );
        return {
          Data: {},
        };
      },
      update: async (event) => {
        const revision = crypto
          .createHash("sha256")
          .update(
            event.ResourceProperties.subgraphs.reduce(
              (acc, subgraph) => acc + subgraph.sdl,
              ""
            )
          )
          .digest("hex")
          .slice(0, 16);
        await this.subgraphService.publishSubgraphs(
          event.ResourceProperties.graphId,
          event.ResourceProperties.variantName,
          revision,
          event.ResourceProperties.subgraphs.map((subgraph) => ({
            name: subgraph.name,
            sdl: subgraph.sdl,
            url: subgraph.url,
          }))
        );

        return {
          Data: {},
        };
      },
      delete: async (event) => {
        for (const subgraph of event.ResourceProperties.subgraphs) {
          await this.subgraphService.deleteSubgraph(
            event.ResourceProperties.graphId,
            subgraph.name,
            event.ResourceProperties.variantName
          );
        }
      },
    });
  }
}
