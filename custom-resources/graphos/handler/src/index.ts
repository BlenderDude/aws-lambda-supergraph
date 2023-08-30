import "reflect-metadata";
import {OnEventRequest, OnEventResponse} from "aws-cdk-lib/custom-resources/lib/provider-framework/types";
import { container as globalContainer } from "tsyringe";
import { GraphResourceManager } from "./resource-managers/GraphResourceManager";
import { ResourceManager } from "./resource-managers/ResourceManager";
import { GraphVariantResourceManager } from "./resource-managers/GraphVariantResourceManager";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

type ResourceMap = Record<
  string,
  { new (...args: any[]): ResourceManager<any, any> }
>;

const resourceMap: ResourceMap = {
  "Custom::GraphOS-Graph": GraphResourceManager,
  "Custom::GraphOS-GraphVariant": GraphVariantResourceManager,
};

export async function handler(
  event: OnEventRequest,
): Promise<OnEventResponse> {
  const container = globalContainer.createChildContainer();

  if(event.ResourceProperties.apiKey.value) {
    container.register("ApolloGraphQLAPIKey", {
      useValue: event.ResourceProperties.apiKey,
    });
  } else if (event.ResourceProperties.apiKey.secretArn) {
    const client = new SecretsManagerClient({});
    const result = await client.send(new GetSecretValueCommand({
      SecretId: event.ResourceProperties.apiKey.secretArn,
    }));
    container.register("ApolloGraphQLAPIKey", {
      useValue: result.SecretString!,
    });
  } else {
    throw new Error("No API Key provided");
  }

  const resourceManager = container.resolve(resourceMap[event.ResourceType]);

  switch (event.RequestType) {
    case "Create":
      return await resourceManager.create(event);
    case "Update":
      return await resourceManager.update(event);
    case "Delete":
      return await resourceManager.delete(event);
  }
}
