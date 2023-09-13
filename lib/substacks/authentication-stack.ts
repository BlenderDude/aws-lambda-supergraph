import * as cdk from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class AuthenticationStack extends cdk.Stack {
  public authFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const jwtSecret = new Secret(this, "JwtSecret");

    const fn = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(
        path.join(process.cwd(), "authentication")
      ),
      handler: "dist/index.default",
      environment: {
        JWT_SECRET_ARN: jwtSecret.secretArn,
      },
    });

    jwtSecret.grantRead(fn);

    this.authFunction = fn;
  }
}
