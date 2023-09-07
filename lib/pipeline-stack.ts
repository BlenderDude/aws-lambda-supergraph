import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as pipelines from "aws-cdk-lib/pipelines";
import { SubgraphStage } from "./stages/subgraph-stage";

interface PipelineStackProps extends cdk.StackProps {
  runChecks: boolean;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

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

    const graphRef = "cloud-test@main";

    const wave = pipeline.addWave("Subgraphs");

    for (const subgraphName of ["products", "reviews", "users"]) {
      const subgraph = new SubgraphStage(this, subgraphName + "-Subgraph", {
        subgraphName,
      });
      const stage = wave.addStage(subgraph);
      const subgraphDir = `subgraphs/${subgraphName}`;

      if (props.runChecks) {
        stage.addPre(
          new pipelines.ShellStep("Check-" + subgraphName, {
            installCommands: [
              "curl -sSL https://rover.apollo.dev/nix/latest | sh",
            ],
            commands: [
              `/root/.rover/bin/rover subgraph check ${graphRef} --schema ${subgraphDir}/schema.graphql --name ${subgraphName}`,
            ],
            env: {
              APOLLO_KEY: "user:gh.BlenderDude:sX6sWH7Be7CHCPm9TVj4cw",
            },
          })
        );
      }

      stage.addPost(
        new pipelines.CodeBuildStep("Publish-" + subgraphName, {
          installCommands: [
            "curl -sSL https://rover.apollo.dev/nix/latest | sh",
          ],
          commands: [
            `/root/.rover/bin/rover subgraph publish ${graphRef} --schema ${subgraphDir}/schema.graphql --name ${subgraphName} --routing-url $ROUTING_URL`,
          ],
          envFromCfnOutputs: {
            ROUTING_URL: subgraph.url,
          },
          env: {
            APOLLO_KEY: "user:gh.BlenderDude:sX6sWH7Be7CHCPm9TVj4cw",
          },
        })
      );
    }
  }
}
