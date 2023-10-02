import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

interface LambdaSubgraphProps extends cdk.NestedStackProps {
  subgraphName: string;
  extraEnv?: Record<string, string>;
}

export class LambdaSubgraph extends cdk.NestedStack {
  public fn: lambda.IFunction;

  constructor(scope: Construct, id: string, props: LambdaSubgraphProps) {
    super(scope, id, props);

    const { subgraphName } = props;

    const table = new dynamodb.Table(this, "Table", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.fn = new lambda.Function(this, "SubgraphFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(process.cwd(), {
        file: "Dockerfile.subgraph",
        buildArgs: {
          SUBGRAPH_NAME: subgraphName,
        },
      }),
      handler: "dist/index.default",
      environment: {
        DDB_TABLE_NAME: table.tableName,
        ...props.extraEnv,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
    });

    table.grantReadWriteData(this.fn);
  }
}
