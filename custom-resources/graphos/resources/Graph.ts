import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import { GraphOSProvider } from "../provider";
import { GraphVariant } from "./GraphVariant";

interface GraphOSGraphProps {
  /**
   * The title of the graph.
   */
  title: string;
  /**
   * If the graph should be hidden from uninvited non-admin users.
   * @default false
   */
  hiddenFromUninvitedNonAdmin?: boolean;
  /**
   * API Key
   */
  apiKey: string;
  /**
   * Account ID
   */
  accountId?: string;
}

export class Graph extends Construct {
  public readonly title: string;
  public readonly hiddenFromUninvitedNonAdmin: boolean;
  public readonly graphId: string;
  private apiKey: string;

  constructor(scope: Construct, id: string, props: GraphOSGraphProps) {
    super(scope, id);

    if (props.title.length > 64) {
      throw new Error("Title must be less than 64 characters");
    }

    const resource = new cdk.CustomResource(this, "Graph", {
      serviceToken: GraphOSProvider.getOrCreate(this),
      resourceType: "Custom::GraphOS-Graph",
      properties: {
        title: props.title,
        hiddenFromUninvitedNonAdmin: props.hiddenFromUninvitedNonAdmin,
        apiKey: props.apiKey,
        accountId: props.accountId,
      },
    });

    this.apiKey = props.apiKey;

    this.graphId = resource.getAttString("Id");
    this.title = resource.getAttString("Title");
    this.hiddenFromUninvitedNonAdmin =
      resource.getAttString("HiddenFromUninvitedNonAdmin") === "true";
  }

  public addVariant(
    variant: GraphVariant,
  ) {
    const resource = new cdk.CustomResource(this, "GraphVariant-" + variant.name, {
      serviceToken: GraphOSProvider.getOrCreate(this),
      resourceType: "Custom::GraphOS-GraphVariant",
      properties: {
        apiKey: this.apiKey,
        graphId: this.graphId,
        name: variant.name,
        subgraphs: variant.subgraphs,
      },
    });

    return {
      url: resource.getAttString("Url"),
    }
  }
      
}
