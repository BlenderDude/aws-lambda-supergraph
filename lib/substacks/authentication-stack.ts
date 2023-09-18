import * as cdk from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class AuthenticationStack extends cdk.NestedStack {
  public authFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const jwtSecret = new Secret(this, "JwtSecret");

    const fn = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(
        path.join(process.cwd(), "authentication")
      ),
      handler: "dist/index.handler",
      environment: {
        JWT_SECRET_ARN: jwtSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      currentVersionOptions: {
        provisionedConcurrentExecutions: 1,
      },
    });

    jwtSecret.grantRead(fn);

    this.authFunction = fn;
  }
}
