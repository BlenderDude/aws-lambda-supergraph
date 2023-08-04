import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");

class GraphOSSubgraphProvider extends Construct {
  public static getOrCreate(scope: Construct) {
    const stack = cdk.Stack.of(scope);
    const id = "custom-resources:GraphOSGraphProvider";
    const provider =
      (stack.node.tryFindChild(id) as GraphOSSubgraphProvider) ??
      new GraphOSSubgraphProvider(stack, id);
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
   * Subgraph name
   */
  subgraphName: string;
  /**
   * SDL
   */
  sdl: string;
  /**
   * Subgraph URL
   */
  subgraphUrl: string;
}

export class Subgraph extends Construct {

  constructor(scope: Construct, id: string, props: GraphOSGraphProps) {
    super(scope, id);

    const resource = new cdk.CustomResource(this, "Subgraph", {
      serviceToken: GraphOSSubgraphProvider.getOrCreate(this),
      resourceType: "Custom::GraphOS-Subgraph",
      properties: {
        apiKey: props.apiKey,
        graphId: props.graphId,
        variantName: props.variantName,
        subgraphName: props.subgraphName,
        sdl: props.sdl,
        url: props.subgraphUrl,
      },
    });
  }
}
