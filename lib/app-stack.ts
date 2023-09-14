// import * as cdk from "aws-cdk-lib";
// import { Construct } from "constructs";
// import * as fs from "fs";
// import * as path from "path";
// import * as lambda from "aws-cdk-lib/aws-lambda";

// export class AWSLambdaSupergraphStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     // Create a subgraph for each application in the `subgraphs` directory
//     for (const subgraphName of ["products", "reviews", "users"]) {
//       // Create subgraph function from Dockerfile in each subgraph
//       const fn = new lambda.Function(this, subgraphName + "-SubgraphFunction", {
//         runtime: lambda.Runtime.NODEJS_18_X,
//         code: lambda.Code.fromDockerBuild(
//           path.join(process.cwd(), "subgraphs", subgraphName)
//         ),
//         handler: "dist/index.default",
//       });

//       // Allow the Supergraph to access the subgraph via a function url
//       // TODO SigV4 auth when implemented
//       const { url } = fn.addFunctionUrl({
//         authType: lambda.FunctionUrlAuthType.NONE,
//         cors: {
//           allowCredentials: true,
//           allowedHeaders: ["*"],
//           allowedOrigins: ["*"],
//         },
//         invokeMode: lambda.InvokeMode.BUFFERED,
//       });

//       // Read the SDL from the local `schema.graphql` file in each subgraph
//       const sdl = fs.readFileSync(
//         path.join(process.cwd(), "subgraphs", subgraphName, "schema.graphql"),
//         "utf8"
//       );

//       variant.addSubgraph(subgraphName, {
//         sdl,
//         url,
//       });
//     }


//     const { url } = graph.addVariant(variant);

//     // Output the Supergraph URL
//     new cdk.CfnOutput(this, "SupergraphUrl", {
//       value: url,
//     });

//     // Sandbox URL
//     new cdk.CfnOutput(this, "SandboxUrl", {
//       value: `https://studio.apollographql.com/sandbox/explorer?endpoint=${url}`,
//     });

//     new cdk.CfnOutput(this, "ExplorerURL", {
//       value: `https://studio.apollographql.com/graph/${graph.graphId}/variant/${variant.name}/explorer`,
//     });
//   }
// }

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthenticationStack } from "./substacks/authentication-stack";
import { LambdaSubgraph } from "./substacks/lambda-subgraph-stack";
import { TableStack } from "./substacks/table-stack";

interface AppStackProps extends cdk.StackProps {
  subgraphs: string[];
}

export class AppStack extends cdk.Stack {

  urls: Record<string, cdk.CfnOutput> = {};

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { table } = new TableStack(this, "TableStack");
    const { authFunction } = new AuthenticationStack(
      this,
      "AuthenticationStack"
    );

    for (const subgraphName of props.subgraphs) {
      const subgraph = new LambdaSubgraph(this, subgraphName + "-Subgraph", {
        subgraphName,
        table,
        authFunction,
      });

      this.urls[subgraphName] = new cdk.CfnOutput(this, `SubgraphUrl-${subgraphName}`, {
        value: subgraph.url.value,
      });
    }

  }
}