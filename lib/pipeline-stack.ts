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

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    this.graphOSApiKey = Secret.fromSecretNameV2(this, 'GraphOSApiKey', 'graphos-api-key');

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

    const devStage = new SubgraphStage(this, "Dev", {});
    
    pipeline.addStage(devStage, {
      pre: devStage.createCheckSteps(`${props.graphId}@dev`, this.graphOSApiKey),
    });

    pipeline.addWave("Prod-Approval", {
      pre: [
        new pipelines.ManualApprovalStep("Approve-Prod", {})
      ]
    })

    const prodStage = new SubgraphStage(this, "Prod", {});

    pipeline.addStage(prodStage, {
      pre: prodStage.createCheckSteps(`${props.graphId}@main`, this.graphOSApiKey),
      post: prodStage.createPublishSteps(`${props.graphId}@main`, this.graphOSApiKey),
    })
  }
}
