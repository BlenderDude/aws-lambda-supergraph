import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { env } from "../env";
import crypto from "crypto";

export type ReviewModel = {
  pk: string;
  sk: string;
  body: string;
  rating: number;
  productId: string;
  userId: string;
};

export class ReviewRepository {
  constructor(private ddb: DynamoDBDocumentClient) {}

  private buildReviewPk(productId: string) {
    return `ProductReview#${productId}`;
  }

  async create(modelInput: Omit<ReviewModel, "pk" | "sk">) {
    const pk = this.buildReviewPk(modelInput.productId);
    const sk = Buffer.alloc(8);
    sk.writeUIntBE(Math.floor(new Date().getTime() / 1000), 0, 6);
    sk.write(crypto.randomBytes(2).toString("hex"), 6, "hex");
    const model = {
      ...modelInput,
      pk,
      sk: sk.toString("hex"),
    };
    await this.ddb.send(
      new PutCommand({
        TableName: env.DDB_TABLE_NAME,
        Item: model,
      })
    );
    return model;
  }

  async *loadAll(
    productId: string,
    startFrom?: string
  ): AsyncIterableIterator<ReviewModel> {
    const pk = this.buildReviewPk(productId);
    let lastEvaluatedKey: Record<string, string> | undefined = undefined;
    do {
      const result: QueryCommandOutput = await this.ddb.send(
        new QueryCommand({
          TableName: env.DDB_TABLE_NAME,
          KeyConditionExpression: "#pk = :pk AND #sk > :sk",
          ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
          },
          ExpressionAttributeValues: {
            ":pk": pk,
            ":sk": startFrom ?? "",
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      lastEvaluatedKey = result.LastEvaluatedKey ?? undefined;
      for (const item of result.Items ?? []) {
        yield item as ReviewModel;
      }
    } while (lastEvaluatedKey !== undefined);
  }

  async load(productId: string, reviewId: string): Promise<ReviewModel | null> {
    const pk = this.buildReviewPk(productId);
    const result = await this.ddb.send(
      new GetCommand({
        Key: {
          pk,
          sk: reviewId,
        },
        TableName: env.DDB_TABLE_NAME,
      })
    );
    return (result.Item as ReviewModel) ?? null;
  }
}
