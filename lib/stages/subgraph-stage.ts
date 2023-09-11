import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaSubgraph } from "../substacks/LambdaSubgraph";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { TableStack } from "../substacks/TableStack";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";

const subgraphs = ["products", "reviews", "users"];

export class SubgraphStage extends cdk.Stage {
  urls: Record<string, cdk.CfnOutput> = {};

  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const { table } = new TableStack(this, "TableStack");

    for (const subgraphName of subgraphs) {
      const subgraph = new LambdaSubgraph(this, subgraphName + "-Subgraph", {
        subgraphName,
        table,
      });

      this.urls[subgraphName] = subgraph.url;
    }
  }

  createCheckSteps(graphId: string, variant: string, graphOSApiKey: ISecret) {
    const graphRef = `${graphId}@${variant}`;
    return subgraphs.map(subgraphName => {
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
            }
          }
        }
      });
    })
  }

  createPublishSteps(graphId: string, variant: string, graphOSApiKey: ISecret) {
    const graphRef = `${graphId}@${variant}`;
    return subgraphs.map(subgraphName => {
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
            }
          }
        }
      });
    })
  }
}
