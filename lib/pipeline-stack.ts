import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { SubgraphStage } from "./stages/subgraph-stage";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";

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


    const devWave = pipeline.addWave("Subgraphs-Dev");

    const subgraphs = ["products", "reviews", "users"];

    for (const subgraphName of subgraphs) {
      const graphRef = `${props.graphId}@dev`;
      const subgraph = new SubgraphStage(this, subgraphName + "-Subgraph", {
        subgraphName,
      });
      const stage = devWave.addStage(subgraph);
      const subgraphDir = `subgraphs/${subgraphName}`;

      if (props.runChecks) {
        stage.addPre(
          this.createCheckStep(
            graphRef,
            subgraphName,
            `${subgraphDir}/schema.graphql`
          )
        );
      }

      stage.addPost(
        this.createPublishStep(
          graphRef,
          subgraphName,
          `${subgraphDir}/schema.graphql`,
          subgraph.url
        )
      );
    }

    pipeline.addWave("Prod-Approval", {
      pre: [
        new pipelines.ManualApprovalStep("Approve-Prod", {})
      ]
    })

    pipeline.addWave("Subgraphs-Prod");

    for (const subgraphName of subgraphs) {
      const graphRef = `${props.graphId}@main`;
      const subgraph = new SubgraphStage(this, subgraphName + "-SubgraphProd", {
        subgraphName,
      });
      const stage = pipeline.addStage(subgraph);
      const subgraphDir = `subgraphs/${subgraphName}`;

      stage.addPost(
        this.createPublishStep(
          graphRef,
          subgraphName,
          `${subgraphDir}/schema.graphql`,
          subgraph.url
        )
      );
    }
  }

  private createCheckStep(graphRef: string, subgraphName: string, schemaFile: string) {
    return new pipelines.CodeBuildStep("Check-" + subgraphName, {
      installCommands: ["curl -sSL https://rover.apollo.dev/nix/latest | sh"],
      commands: [
        `/root/.rover/bin/rover subgraph check ${graphRef} --schema ${schemaFile} --name ${subgraphName}`,
      ],
      buildEnvironment: {
        environmentVariables: {
          APOLLO_KEY: {
            value: this.graphOSApiKey.secretArn,
            type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          }
        }
      }
    });
  }

  private createPublishStep(graphRef: string, subgraphName: string, schemaFile: string, routingUrl: cdk.CfnOutput) {
    return new pipelines.CodeBuildStep("Publish-" + subgraphName, {
      installCommands: ["curl -sSL https://rover.apollo.dev/nix/latest | sh"],
      commands: [
        `/root/.rover/bin/rover subgraph publish ${graphRef} --schema ${schemaFile} --name ${subgraphName} --routing-url $ROUTING_URL`,
      ],
      envFromCfnOutputs: {
        ROUTING_URL: routingUrl,
      },
      buildEnvironment: {
        environmentVariables: {
          APOLLO_KEY: {
            value: this.graphOSApiKey.secretArn,
            type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
          }
        }
      }
    });
  }
}
