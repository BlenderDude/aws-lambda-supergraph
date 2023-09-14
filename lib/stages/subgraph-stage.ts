import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaSubgraph } from "../substacks/lambda-subgraph-stack";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { TableStack } from "../substacks/table-stack";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { AuthenticationStack } from "../substacks/authentication-stack";
import { AppStack } from "../app-stack";

interface SubgraphStageProps extends cdk.StageProps {
  subgraphs: string[];
}

export class SubgraphStage extends cdk.Stage {
  urls: Record<string, cdk.CfnOutput> = {};
  private subgraphs: string[];

  constructor(scope: Construct, id: string, props: SubgraphStageProps) {
    super(scope, id, props);

    this.subgraphs = props.subgraphs;

    const {urls} = new AppStack(this, "AppStack", {
      subgraphs: props.subgraphs,
    })

    this.urls = urls;
  }

  createCheckSteps(graphId: string, variant: string, graphOSApiKey: ISecret) {
    const graphRef = `${graphId}@${variant}`;
    return this.subgraphs.map((subgraphName) => {
      const schemaFile = `subgraphs/${subgraphName}/schema.graphql`;
      return new pipelines.CodeBuildStep("Check-" + subgraphName, {
        installCommands: ["curl -sSL https://rover.apollo.dev/nix/latest | sh"],
        commands: [
          `/root/.rover/bin/rover subgraph check ${graphRef} --schema ${schemaFile} --name ${subgraphName}`,
        ],
        buildEnvironment: {
          environmentVariables: {
            APOLLO_KEY: {
              value: graphOSApiKey.secretArn,
              type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            },
          },
        },
      });
    });
  }

  createPublishSteps(graphId: string, variant: string, graphOSApiKey: ISecret) {
    const graphRef = `${graphId}@${variant}`;
    return this.subgraphs.map((subgraphName) => {
      const schemaFile = `subgraphs/${subgraphName}/schema.graphql`;
      const routingUrl = this.urls[subgraphName];
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
              value: graphOSApiKey.secretArn,
              type: codebuild.BuildEnvironmentVariableType.SECRETS_MANAGER,
            },
          },
        },
      });
    });
  }
}
