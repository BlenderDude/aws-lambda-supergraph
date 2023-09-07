import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

interface LambdaSubgraphProps extends cdk.StackProps {
  subgraphName: string;
}

export class LambdaSubgraph extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LambdaSubgraphProps) {
    super(scope, id, props);

    const { subgraphName } = props;

    const fn = new lambda.Function(this, subgraphName + "-SubgraphFunction", {
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromDockerBuild(
          path.join(process.cwd(), "subgraphs", subgraphName)
        ),
        handler: "dist/index.default",
      });

      // Allow the Supergraph to access the subgraph via a function url
      // TODO SigV4 auth when implemented
      const { url } = fn.addFunctionUrl({
        authType: lambda.FunctionUrlAuthType.NONE,
        cors: {
          allowCredentials: true,
          allowedHeaders: ["*"],
          allowedOrigins: ["*"],
        },
        invokeMode: lambda.InvokeMode.BUFFERED,
      });

  }
}