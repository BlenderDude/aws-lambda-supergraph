import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { AppStack } from "../app-stack";

interface SubgraphStageProps extends cdk.StageProps {
  graphId: string;
  variant: string;
  graphOSApiKey: ISecret;
}

export class AppStage extends cdk.Stage {
  private appStack: AppStack;
  private variant: string;
  private graphId: string;
  private graphOSApiKey: ISecret;

  constructor(scope: Construct, id: string, props: SubgraphStageProps) {
    super(scope, id, props);

    this.variant = props.variant;
    this.graphId = props.graphId;
    this.graphOSApiKey = props.graphOSApiKey;
    this.appStack = new AppStack(this, "AppStack", {
      variant: this.variant,
    });
  }

  createCheckSteps() {
    const graphRef = `${this.graphId}@${this.variant}`;
    return [...this.appStack.subgraphs.keys()].map((subgraphName) => {
      const schemaFile = `subgraphs/${subgraphName}/schema.graphql`;
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
            },
          },
        },
      });
    });
  }

  createPublishSteps() {
    const graphRef = `${this.graphId}@${this.variant}`;
    return [...this.appStack.subgraphs.entries()].map(
      ([subgraphName, { url }]) => {
        const schemaFile = `subgraphs/${subgraphName}/schema.graphql`;
        return new pipelines.CodeBuildStep("Publish-" + subgraphName, {
          installCommands: [
            "curl -sSL https://rover.apollo.dev/nix/latest | sh",
          ],
          commands: [
            `/root/.rover/bin/rover subgraph publish ${graphRef} --schema ${schemaFile} --name ${subgraphName} --routing-url $ROUTING_URL`,
          ],
          envFromCfnOutputs: {
            ROUTING_URL: url,
          },
          buildEnvironment: {
            environmentVariables: {
              APOLLO_KEY: {
                value: this.graphOSApiKey.secretArn,
                type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
              },
            },
          },
        });
      }
    );
  }
}
