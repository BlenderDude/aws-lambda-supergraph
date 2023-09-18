import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface LambdaSubgraphProps extends cdk.NestedStackProps {
  subgraphName: string;
  table: dynamodb.ITable;
  authFunction: lambda.IFunction;
}

export class LambdaSubgraph extends cdk.NestedStack {
  public url: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: LambdaSubgraphProps) {
    super(scope, id, props);

    const { subgraphName, table, authFunction } = props;

    const fn = new lambda.Function(this, "SubgraphFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(
        process.cwd(),
        {
          file: "Dockerfile.subgraph",
          buildArgs: {
            SUBGRAPH_NAME: subgraphName,
          }
        }
      ),
      handler: "dist/index.default",
      environment: {
        DDB_TABLE_NAME: table.tableName,
        AUTHENTICATION_FUNCTION_NAME: authFunction.functionName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    table.grantReadWriteData(fn);
    authFunction.grantInvoke(fn);

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

    this.url = new cdk.CfnOutput(this, "SubgraphUrl", {
      value: url,
    });
  }
}
