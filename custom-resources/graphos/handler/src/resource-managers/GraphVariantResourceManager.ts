import { z } from "zod";
import { ResourceManager } from "./ResourceManager";
import { injectable } from "tsyringe";
import { SubgraphService } from "../services/SubgraphService";
import { VariantService } from "../services/VariantService";
import crypto from "crypto";

const GraphVariantPropertiesSchema = z.object({
  graphId: z.string(),
  name: z.string(),
  subgraphs: z.record(
    z.string(),
    z.strictObject({
      sdl: z.string(),
      url: z.string(),
    })
  ),
});

const GraphVariantDataSchema = z.object({
  Url: z.string(),
});

@injectable()
export class GraphVariantResourceManager extends ResourceManager<
  typeof GraphVariantPropertiesSchema,
  typeof GraphVariantDataSchema
> {
  constructor(private subgraphService: SubgraphService, private variantService: VariantService) {
    super(GraphVariantPropertiesSchema, GraphVariantDataSchema, {
      id: {
        maxLength: 27,
      },
      create: async (event) => {
        const properties = event.ResourceProperties;
        await this.subgraphService.synchronizeSubgraphs(
          properties.graphId,
          crypto.randomBytes(8).toString("hex"),
          {
            [properties.name]: {
              subgraphs: properties.subgraphs,
            }
          }
        );
        const url = await this.variantService.getUrl(properties.graphId, properties.name);
        return {
          PhysicalResourceId: event.PhysicalResourceId,
          Data: {
            Url: url,
          }
        };
      },
      update: async (event) => {
        const properties = event.ResourceProperties;
        await this.subgraphService.synchronizeSubgraphs(
          properties.graphId,
          crypto.randomBytes(8).toString("hex"),
          {
            [properties.name]: {
              subgraphs: properties.subgraphs,
            }
          }
        );
        const url = await this.variantService.getUrl(properties.graphId, properties.name);
        return {
          PhysicalResourceId: event.PhysicalResourceId,
          Data: {
            Url: url,
          }
        };
      },
      delete: async (event) => {
        await this.subgraphService.synchronizeSubgraphs(
          event.ResourceProperties.graphId,
          crypto.randomBytes(8).toString("hex"),
          {
            [event.ResourceProperties.name]: {
              subgraphs: {},
            }
          }
        );
      },
    });
  }
}