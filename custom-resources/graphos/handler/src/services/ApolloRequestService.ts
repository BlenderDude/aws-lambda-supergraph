import request from "graphql-request";
import {
  TypedDocumentNode,
  VariablesOf,
  ResultOf,
} from "@graphql-typed-document-node/core";
import { DependencyContainer, inject, injectable } from "tsyringe";
import { graphql } from "../gql";

@injectable()
export class ApolloRequestService {
  constructor(@inject("ApolloGraphQLAPIKey") private apiKey: string) {}

  public async request<Result, Variables>(
    document: TypedDocumentNode<Result, Variables>,
    variables: Variables
  ): Promise<Result> {
    return request({
      document,
      url: "https://graphql.api.apollographql.com/",
      variables: variables as any,
      requestHeaders: {
        "X-API-Key": this.apiKey,
      },
    });
  }

  public async getPrimaryAccountId() {
    const data = await this.request(
      graphql(`
        query GetPrimaryAccountId {
          me {
            __typename
            ... on Service {
              account {
                id
              }
            }
            ... on User {
              memberships {
                account {
                  id
                }
              }
            }
          }
        }
      `),
      {}
    );
    if (data.me?.__typename === "Service" && data.me.account) {
      return data.me.account.id;
    }
    if (data.me?.__typename === "User") {
      return data.me.memberships[0].account.id;
    }
    throw new Error("Could not find primary account ID");
  }
}
