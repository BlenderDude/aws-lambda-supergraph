import { injectable } from "tsyringe";
import { ResourceManager } from "./ResourceManager";
import { z } from "zod";
import { GraphService } from "../services/GraphService";
import { GraphType } from "../gql/graphql";
import { SubgraphService } from "../services/SubgraphService";

const GraphPropertiesSchema = z.object({
  accountId: z.string().optional(),
  title: z.string(),
  hiddenFromUninvitedNonAdmin: z.boolean().default(false),
  variants: z.record(
    z.string(),
    z.strictObject({
      subgraphs: z.record(
        z.string(),
        z.strictObject({
          sdl: z.string(),
          url: z.string(),
        })
      ),
    })
  ),
});

const GraphDataSchema = z.object({
  Id: z.string(),
  Title: z.string(),
  HiddenFromUninvitedNonAdmin: z.boolean(),
});

@injectable()
export class GraphResourceManager extends ResourceManager<
  typeof GraphPropertiesSchema,
  typeof GraphDataSchema
> {
  constructor(private graphService: GraphService) {
    super(GraphPropertiesSchema, GraphDataSchema, {
      id: {
        maxLength: 27,
      },
      create: async (event) => {
        await this.graphService.createGraph(
          {
            id: event.PhysicalResourceId,
            title: event.ResourceProperties.title,
            hiddenFromUninvitedNonAdmin:
              event.ResourceProperties.hiddenFromUninvitedNonAdmin,
            graphType: GraphType.CloudSupergraph,
            variants: event.ResourceProperties.variants,
          },
          event.ResourceProperties.accountId
        );

        return {
          PhysicalResourceId: event.PhysicalResourceId,
          Data: {
            Id: event.PhysicalResourceId,
            Title: event.ResourceProperties.title,
            HiddenFromUninvitedNonAdmin:
              event.ResourceProperties.hiddenFromUninvitedNonAdmin,
          },
        };
      },
      update: async (event) => {
        await this.graphService.updateGraph({
          id: event.PhysicalResourceId,
          title: event.ResourceProperties.title,
          hiddenFromUninvitedNonAdmin:
            event.ResourceProperties.hiddenFromUninvitedNonAdmin,
          graphType: GraphType.CloudSupergraph,
          variants: event.ResourceProperties.variants,
        });
        return {
          Data: {
            Id: event.PhysicalResourceId,
            Title: event.ResourceProperties.title,
            HiddenFromUninvitedNonAdmin:
              event.ResourceProperties.hiddenFromUninvitedNonAdmin,
          },
        };
      },
      delete: async (event) => {
        await this.graphService.deleteGraph(event.PhysicalResourceId);
      },
    });
  }
}
