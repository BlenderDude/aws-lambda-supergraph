import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaSubgraph } from "../substacks/LambdaSubgraph";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

type SubgraphStageProps = cdk.StageProps & {
  subgraphName: string;
  table: dynamodb.Table;
}

export class SubgraphStage extends cdk.Stage {
  url: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: SubgraphStageProps) {
    super(scope, id, props);

    const subgraph = new LambdaSubgraph(this, props.subgraphName + "-Subgraph", {
      subgraphName: props.subgraphName,
      table: props.table,
    });

    this.url = subgraph.url;
  }
}