import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  DeleteCommand,
  ScanCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { env } from "../env";

export type ProductModel = {
  pk: string;
  sk: string;
  name: string;
  price: number;
  createdByUserId: string;
};

export class ProductRepository {
  private entityPk = "Product-Entity";

  private generatePk(id: string) {
    return `${this.entityPk}#${id}`;
  }

  constructor(private ddb: DynamoDBDocumentClient) {}

  async load(id: string): Promise<ProductModel | null> {
    const result = await this.ddb.send(
      new GetCommand({
        Key: {
          pk: this.generatePk(id),
          sk: "metadata",
        },
        TableName: env.DDB_TABLE_NAME,
      })
    );

    return (result.Item as ProductModel) ?? null;
  }

  async *loadAll(): AsyncIterableIterator<ProductModel> {
    let lastEvaluatedKey: Record<string, string> | undefined = undefined;

    do {
      const result: ScanCommandOutput = await this.ddb.send(
        new ScanCommand({
          TableName: env.DDB_TABLE_NAME,
          FilterExpression: "begins_with(#pk, :pk)",
          ExpressionAttributeNames: {
            "#pk": "pk",
          },
          ExpressionAttributeValues: {
            ":pk": this.entityPk,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      lastEvaluatedKey = result.LastEvaluatedKey;
      for (const item of result.Items ?? []) {
        yield item as ProductModel;
      }
    } while (lastEvaluatedKey !== undefined);
  }

  async create(modelInput: Omit<ProductModel, "pk" | "sk">) {
    const id = crypto.randomBytes(8).readBigUInt64LE();
    const pk = this.generatePk(id.toString());
    const sk = "metadata";
    const product: ProductModel = {
      pk,
      sk,
      ...modelInput,
    };
    await this.ddb.send(
      new PutCommand({
        TableName: env.DDB_TABLE_NAME,
        Item: product,
      })
    );
    return product;
  }

  async delete(model: ProductModel) {
    await this.ddb.send(
      new DeleteCommand({
        TableName: env.DDB_TABLE_NAME,
        Key: {
          pk: model.pk,
          sk: "metadata",
        },
      })
    );
  }

  async update(input: ProductModel) {
    await this.ddb.send(
      new PutCommand({
        TableName: env.DDB_TABLE_NAME,
        Item: input,
      })
    );
  }

  getId(model: ProductModel) {
    return model.pk.split("#")[1];
  }
}
