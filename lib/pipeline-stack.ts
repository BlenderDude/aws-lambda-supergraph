import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as pipelines from "aws-cdk-lib/pipelines";

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      selfMutation: true,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(
          "BlenderDude/aws-lambda-supergraph",
          "main",
          {
            authentication: cdk.SecretValue.secretsManager(
              "github-token",
            ),
          },
        ),
        commands: [
          "npm ci",
          "npm run build",
          "npx cdk synth",
        ],
      }),
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
    });

    const wave = pipeline.addWave("Composition", {
      pre: [
        new pipelines.ShellStep("Install", {
          commands: [
            "curl -sSL https://rover.apollo.dev/nix/latest | sh",
          ]
        }),
      ]
    });

    const graphRef = "cloud-test@main";

    for(const subgraphName of ["products", "reviews", "users"]) {
      const subgraphDir = `subgraphs/${subgraphName}`;
      wave.addPost(
        new pipelines.ShellStep("Check-" + subgraphName, {
          commands: [
            `rover subgraph check ${graphRef} --schema ${subgraphDir}/schema.graphql --name ${subgraphName}`,
          ],
          env: {
            APOLLO_KEY: "user:gh.BlenderDude:sX6sWH7Be7CHCPm9TVj4cw"
          },
          
        })
      );
    }
  }
}
