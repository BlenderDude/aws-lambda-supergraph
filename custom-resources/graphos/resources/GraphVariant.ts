import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import { GraphOSProvider } from "../provider";

interface GraphOSGraphProps {
  apiKey: string;
  graphId: string;
  name: string;
  subgraphs: Record<
    string,
    {
      sdl: string;
      url: string;
    }
  >;
}

export class GraphVariant extends Construct {
  public readonly url: string;

  constructor(scope: Construct, id: string, props: GraphOSGraphProps) {
    super(scope, id);

    const resource = new cdk.CustomResource(this, "GraphVariant", {
      serviceToken: GraphOSProvider.getOrCreate(this),
      resourceType: "Custom::GraphOS-GraphVariant",
      properties: {
        apiKey: props.apiKey,
        graphId: props.graphId,
        name: props.name,
        subgraphs: props.subgraphs,
      },
    });

    this.url = resource.getAttString("Url");
  }
}
