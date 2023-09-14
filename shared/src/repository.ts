import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

Buffer.alloc(8).readBigUint64LE(0);

export type BaseModel = {
  pk: string;
  sk: BigInt;
};

export abstract class Repository<M extends BaseModel> {
  constructor(
    protected ddb: DynamoDBDocumentClient,
    protected tableName: string,
  ) {}

  async loadAll(pk: M['pk']) {

    const result = await this.ddb.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: {
          ":pk": pk,
        },
      })
    );
    return (result.Items as Array<M>) ?? [];
  }

  async load(pk: M['pk'], sk: M['sk']) {
    const result = await this.ddb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk,
          sk,
        },
      })
    );
    return (result.Item ?? null) as M | null;
  }

  async create(pk: M['pk'], sk: M['sk'], modelInput: Omit<M, "pk" | "sk">) {
    const model = {
      pk,
      sk,
      ...modelInput,
    };
    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: model,
      })
    );
    return model;
  }

  async save(model: M) {
    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: model,
      })
    );
    return model;
  }

  async delete(pk: M['pk'], sk: M['sk']) {
    await this.ddb.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          pk,
          sk,
        },
      })
    );
  }

  convertSkToId(sk: bigint) {
    const buff = Buffer.alloc(8);
    buff.writeBigUInt64LE(sk);
    return buff.toString('hex');
  }
}
