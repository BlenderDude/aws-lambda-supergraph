#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AWSLambdaSupergraphStack } from '../lib/aws-lambda-supergraph-stack';

const app = new cdk.App();
new AWSLambdaSupergraphStack(app, 'AWSLambdaSupergraphStack', {});
