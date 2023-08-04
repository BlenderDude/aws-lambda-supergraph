import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");

class GraphOSSubgraphsProvider extends Construct {
  public static getOrCreate(scope: Construct) {
    const stack = cdk.Stack.of(scope);
    const id = "custom-resources:GraphOSGraphProvider";
    const provider =
      (stack.node.tryFindChild(id) as GraphOSSubgraphsProvider) ??
      new GraphOSSubgraphsProvider(stack, id);
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

interface GraphOSSubgraphsProps {
  /**
   * API Key
   */
  apiKey: string;
  /**
   * Graph ID
   */
  graphId: string;
  /**
   * Variant name
   */
  variantName: string;
  /**
   * Subgraphs
   */
  subgraphs: Array<{
    /**
     * Subgraph name
     */
    name: string;
    /**
     * SDL
     */
    sdl: string;
    /**
     * Subgraph URL
     */
    url: string;
  }>;
}

export class Subgraphs extends Construct {

  constructor(scope: Construct, id: string, props: GraphOSSubgraphsProps) {
    super(scope, id);

    const resource = new cdk.CustomResource(this, "Subgraphs", {
      serviceToken: GraphOSSubgraphsProvider.getOrCreate(this),
      resourceType: "Custom::GraphOS-Subgraphs",
      properties: {
        apiKey: props.apiKey,
        graphId: props.graphId,
        variantName: props.variantName,
        subgraphs: props.subgraphs,
      },
    });
  }
}
