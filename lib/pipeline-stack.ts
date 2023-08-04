import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { SupergraphStage } from './supergraph-stage';

export class CDKPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'CDKDeployment',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('BlenderDude/aws-lambda-supergraph', 'main', {
          authentication: cdk.SecretValue.secretsManager('github-token')
        }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      }),
      dockerEnabledForSynth: true,
    });
    
    pipeline.addStage(new SupergraphStage(this, 'LambdaSupergraph'));
  }
}