import * as cdk from "aws-cdk-lib";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class AuthorizerStack extends cdk.NestedStack {
  public authFunction: lambda.IFunction;
  public jwtSecret: secrets.ISecret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.jwtSecret = new secrets.Secret(this, "JwtSecret");

    const fn = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(path.join(process.cwd(), "authorizer")),
      handler: "dist/index.handler",
      environment: {
        JWT_SECRET_ARN: this.jwtSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
    });

    this.jwtSecret.grantRead(fn);

    this.authFunction = fn;
  }
}
