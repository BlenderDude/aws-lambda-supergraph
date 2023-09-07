import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaSubgraph } from "../substacks/LambdaSubgraph";

type SubgraphStageProps = cdk.StageProps & {
  subgraphName: string;
}

export class SubgraphStage extends cdk.Stage {
  url: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: SubgraphStageProps) {
    super(scope, id, props);

    const subgraph = new LambdaSubgraph(this, props.subgraphName + "-Subgraph", {
      subgraphName: props.subgraphName,
    })

    this.url = new cdk.CfnOutput(this, "SubgraphUrl", {
      value: subgraph.url,
    });
  }
}