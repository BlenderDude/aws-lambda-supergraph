#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

const app = new cdk.App();

const graphOSApiKey = Secret.fromSecretNameV2(app, 'GraphOSApiKey', 'graphos-api-key');

new PipelineStack(app, 'Pipeline', {
  runChecks: false,
  graphId: "cloud-test",
  graphOSApiKey,
});
