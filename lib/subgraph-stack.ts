import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

interface AWSLambdaSubgraphStackProps extends cdk.StackProps {
  subgraph: string;
}

export class AWSLambdaSubgraphStack extends cdk.Stack {
  public subgraphUrl: string;

  constructor(scope: Construct, id: string, props: AWSLambdaSubgraphStackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, 'SubgraphFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromDockerBuild(path.join(process.cwd(), 'subgraphs', props.subgraph)),
      handler: 'dist/index.default',
    });

    const fnUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowCredentials: true,
        allowedHeaders: ['*'],
        allowedOrigins: ['*'],
      },
      invokeMode: lambda.InvokeMode.BUFFERED,
    });


    this.subgraphUrl = fnUrl.url;
  }
}