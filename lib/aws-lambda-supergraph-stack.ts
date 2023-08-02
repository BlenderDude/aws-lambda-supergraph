import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AWSLambdaSubgraphStack } from './subgraph-stack';

export class AWSLambdaSupergraphStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsSubgraph = new AWSLambdaSubgraphStack(this, 'ProductsSubgraph', {
      subgraph: 'products',
    });

    const reviewsSubgraph = new AWSLambdaSubgraphStack(this, 'ReviewsSubgraph', {
      subgraph: 'products',
    });

    new cdk.CfnOutput(this, 'subgraphs', {
      value: JSON.stringify({
        products: productsSubgraph.subgraphUrl,
        reviews: reviewsSubgraph.subgraphUrl,
      }),
    });
  }
}
