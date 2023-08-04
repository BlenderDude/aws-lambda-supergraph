import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");

class GraphOSGraphProvider extends Construct {
  public static getOrCreate(scope: Construct) {
    const stack = cdk.Stack.of(scope);
    const id = "custom-resources:GraphOSGraphProvider";
    const provider =
      (stack.node.tryFindChild(id) as GraphOSGraphProvider) ??
      new GraphOSGraphProvider(stack, id);
    return provider.provider.serviceToken;
  }

  private readonly provider: cr.Provider;

  private constructor(scope: Construct, id: string) {
    super(scope, id);
    const fn = new lambda.Function(this, "CustomHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(path.join(__dirname, "..", "handler")),
      handler: "dist/index.handler",
      timeout: cdk.Duration.seconds(120),
    });
    this.provider = new cr.Provider(this, "graphos-graph-provider", {
      onEventHandler: fn,
    });
  }
}

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
  /**
   * Variants
   */
  variants: Record<
    string,
    {
      /**
       * Subgraphs
       */
      subgraphs: Record<
        string,
        {
          /**
           * SDL
           */
          sdl: string;
          /**
           * URL
           */
          url: string;
        }
      >;
    }
  >;
}

export class Graph extends Construct {
  public readonly title: string;
  public readonly hiddenFromUninvitedNonAdmin: boolean;
  public readonly graphId: string;

  constructor(scope: Construct, id: string, props: GraphOSGraphProps) {
    super(scope, id);

    if (props.title.length > 64) {
      throw new Error("Title must be less than 64 characters");
    }

    const resource = new cdk.CustomResource(this, "Graph", {
      serviceToken: GraphOSGraphProvider.getOrCreate(this),
      resourceType: "Custom::GraphOS-Graph",
      properties: {
        title: props.title,
        hiddenFromUninvitedNonAdmin: props.hiddenFromUninvitedNonAdmin,
        apiKey: props.apiKey,
        accountId: props.accountId,
        variants: props.variants,
      },
    });

    this.graphId = resource.getAttString("Id");
    this.title = resource.getAttString("Title");
    this.hiddenFromUninvitedNonAdmin =
      resource.getAttString("HiddenFromUninvitedNonAdmin") === "true";
  }
}
