import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as graphos from "../custom-resources/graphos";
import * as fs from "fs";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class AWSLambdaSupergraphStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a subgraph for each application in the `subgraphs` directory
    const subgraphs: Record<string, {
      sdl: string;
      url: string;
    }> = {};
    for (const subgraphName of ["products", "reviews", "users"]) {
      // Create subgraph function from Dockerfile in each subgraph
      const fn = new lambda.Function(this, subgraphName + '-SubgraphFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromDockerBuild(path.join(process.cwd(), 'subgraphs', subgraphName)),
        handler: 'dist/index.default',
      });
  
      // Allow the Supergraph to access the subgraph via a function url
      // TODO SigV4 auth when implemented
      const {url} = fn.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
        cors: {
          allowCredentials: true,
          allowedHeaders: ['*'],
          allowedOrigins: ['*'],
        },
        invokeMode: lambda.InvokeMode.BUFFERED,
      });

      // Read the SDL from the local `schema.graphql` file in each subgraph
      const sdl = fs.readFileSync(
        path.join(process.cwd(), "subgraphs", subgraphName, "schema.graphql"),
        "utf8"
      )

      subgraphs[subgraphName] = {
        sdl,
        url,
      }
    }

    // Create/Update the Supergraph
    const graph = new graphos.Graph(this, "Supergraph", {
      apiKey: "user:gh.BlenderDude:jlr1D1NssA54Ty2ZaWnJdg",
      title: "Store Supergraph",
    });

    // Create variant
    const variant = new graphos.GraphVariant(this, "SupergraphVariant", {
      apiKey: "user:gh.BlenderDude:jlr1D1NssA54Ty2ZaWnJdg",
      graphId: graph.graphId,
      name: "main",
      subgraphs,
    });

    // Output the Supergraph URL
    new cdk.CfnOutput(this, "SupergraphUrl", {
      value: variant.url,
    });

    // Sandbox URL
    new cdk.CfnOutput(this, "SandboxUrl", {
      value: `https://studio.apollographql.com/sandbox/explorer?endpoint=${variant.url}`
    });
  }
}
