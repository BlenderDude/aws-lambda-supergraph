import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as cr from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";

export class GraphOSProvider extends Construct {
  public static getOrCreate(
    scope: Construct,
    secretArn: string | undefined
  ) {
    const stack = cdk.Stack.of(scope);
    const id = "custom-resources:GraphOSProvider";
    const provider =
      (stack.node.tryFindChild(id) as GraphOSProvider) ??
      new GraphOSProvider(stack, id);
    if (secretArn) {
      provider.addSecretAccess(secretArn);
    }
    return provider.provider.serviceToken;
  }

  private readonly provider: cr.Provider;
  private fn: lambda.Function;

  private constructor(scope: Construct, id: string) {
    super(scope, id);
    this.fn = new lambda.Function(this, "CustomHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(path.join(__dirname, "handler")),
      handler: "dist/index.handler",
      timeout: cdk.Duration.seconds(120),
    });
    this.provider = new cr.Provider(this, "graphos-provider", {
      onEventHandler: this.fn,
    });
  }

  public addSecretAccess(secretArn: string) {
    const statement = new iam.PolicyStatement({
      actions: ["secretsmanager:GetSecretValue"],
      resources: [secretArn],
    });
    this.fn.addToRolePolicy(statement);
  }
}
