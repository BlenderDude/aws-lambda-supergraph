import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigwv2auth from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as apigwv2int from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Construct } from "constructs";
import { AuthorizerStack } from "./substacks/authorizer-stack";
import { LambdaSubgraph } from "./substacks/lambda-subgraph-stack";
import * as crypto from "crypto";

interface AppStackProps extends cdk.StackProps {
  variant: string;
}

export class AppStack extends cdk.Stack {
  public subgraphs = new Map<string, { url: cdk.CfnOutput }>();
  private httpApi: apigwv2.HttpApi;
  private defaultStage: apigwv2.HttpStage;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { authFunction, jwtSecret } = new AuthorizerStack(
      this,
      "AuthenticationStack"
    );

    const authorizer = new apigwv2auth.HttpLambdaAuthorizer(
      "Authorizer",
      authFunction,
      {
        responseTypes: [apigwv2auth.HttpLambdaResponseType.SIMPLE],
        identitySource: [
          "$request.header.Authorization",
          "$request.header.X-Router-Token",
        ],
        resultsCacheTtl: cdk.Duration.hours(1),
      }
    );

    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      defaultAuthorizer: authorizer,
      createDefaultStage: false,
    });

    this.defaultStage = this.httpApi.addStage("MainStage", {
      autoDeploy: true,
    });

    // Products Subgraph
    this.createSubgraph("products", {});

    // Reviews Subgraph
    this.createSubgraph("reviews", {});

    // Users Subgraph
    const usersSubgraph = this.createSubgraph("users", {
      extraEnv: {
        JWT_SECRET_ARN: jwtSecret.secretArn,
      },
    });

    jwtSecret.grantRead(usersSubgraph.fn);
  }

  createSubgraph(
    subgraphName: string,
    options: {
      extraEnv?: Record<string, string>;
    }
  ): LambdaSubgraph {
    const subgraph = new LambdaSubgraph(this, subgraphName + "-Subgraph", {
      subgraphName,
      extraEnv: options.extraEnv,
    });

    const path = "/subgraphs/" + subgraphName;

    this.httpApi.addRoutes({
      path,
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: new apigwv2int.HttpLambdaIntegration(
        "SubgraphIntegration-" + subgraphName,
        subgraph.fn
      ),
    });

    const url = new cdk.CfnOutput(this, subgraphName + "Url", {
      value: this.defaultStage.url.slice(0, -1) + path,
    });

    this.subgraphs.set(subgraphName, { url });

    return subgraph;
  }
}
