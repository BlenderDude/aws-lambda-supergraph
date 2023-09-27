#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

const app = new cdk.App();

new PipelineStack(app, 'Pipeline', {
  runChecks: true,
  graphId: "cloud-test",
});
