import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { SubgraphStage } from "./stages/subgraph-stage";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface PipelineStackProps extends cdk.StackProps {
  runChecks: boolean;
  graphId: string;
}

export class PipelineStack extends cdk.Stack {
  private graphOSApiKey: ISecret;
  private runChecks: boolean;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    this.graphOSApiKey = Secret.fromSecretNameV2(this, 'GraphOSApiKey', 'graphos-api-key');
    this.runChecks = props.runChecks;

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      selfMutation: true,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(
          "BlenderDude/aws-lambda-supergraph",
          "main",
          {
            authentication: cdk.SecretValue.secretsManager("github-token"),
          }
        ),
        commands: ["npm ci", "npm run build", "npx cdk synth"],
      }),
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
      publishAssetsInParallel: false,
    });

    this.addSubgraphStage(pipeline, props.graphId, "dev");

    pipeline.addWave("Prod-Approval", {
      pre: [
        new pipelines.ManualApprovalStep("Approve-Prod", {})
      ]
    })

    this.addSubgraphStage(pipeline, props.graphId, "prod");
  }

  private addSubgraphStage(pipeline: pipelines.CodePipeline, graphId: string, variant: string) {
    const stage = new SubgraphStage(this, `Subgraphs-${variant}`);

    const pipelineStage = pipeline.addStage(stage, {
      post: stage.createPublishSteps(graphId, variant, this.graphOSApiKey),
    })

    if(this.runChecks) {
      pipelineStage.addPre(...stage.createCheckSteps(graphId, variant, this.graphOSApiKey))
    }
  }
}
