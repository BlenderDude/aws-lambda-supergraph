import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AWSLambdaSubgraphStack } from "./subgraph-stack";
import * as graphos from "../custom-resources/graphos";
import * as fs from "fs";
import * as path from "path";

export class AWSLambdaSupergraphStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const subgraphs: Record<string, {
      sdl: string;
      url: string;
    }> = {};

    for (const subgraphName of ["products", "reviews", "users"]) {
      const subgraphFunction = new AWSLambdaSubgraphStack(
        this,
        subgraphName[0].toUpperCase() +
          subgraphName.slice(1) +
          "SubgraphFunction",
        {
          subgraph: subgraphName,
        }
      );

      subgraphs[subgraphName] = {
        sdl: fs.readFileSync(
          path.join(process.cwd(), "subgraphs", subgraphName, "schema.graphql"),
          "utf8"
        ),
        url: subgraphFunction.subgraphUrl,
      }
    }

    const graph = new graphos.Graph(this, "Supergraph", {
      apiKey: "user:gh.BlenderDude:jlr1D1NssA54Ty2ZaWnJdg",
      title: "Store Supergraph",
      variants: {
        main: {
          subgraphs,
        },
      },
    });

    new cdk.CfnOutput(this, "graph", {
      value: graph.title,
    });

    new cdk.CfnOutput(this, "graphId", {
      value: graph.graphId,
    });
  }
}
