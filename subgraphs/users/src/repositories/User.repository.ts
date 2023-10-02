import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { env } from "../env";

export type UserModel = {
  pk: string;
  sk: string;
  name: string;
};

export class UserRepository {
  private buildUserPk(id: string) {
    return `User#${id}`;
  }

  constructor(private ddb: DynamoDBDocumentClient) {}

  async loadUser(id: string): Promise<UserModel | null> {
    const pk = this.buildUserPk(id);
    const result = await this.ddb.send(
      new GetCommand({
        Key: {
          pk,
          sk: "metadata",
        },
        TableName: env.DDB_TABLE_NAME,
      })
    );
    return result.Item as UserModel | null;
  }

  async createUser(
    modelInput: Omit<UserModel, "pk" | "sk">
  ): Promise<UserModel> {
    const id = crypto.randomBytes(8).toString("hex");
    const pk = this.buildUserPk(id);
    const sk = "metadata";
    const model: UserModel = {
      ...modelInput,
      pk,
      sk,
    };
    await this.ddb.send(
      new PutCommand({
        TableName: env.DDB_TABLE_NAME,
        Item: model,
      })
    );
    return model;
  }

  getUserId(user: UserModel) {
    return user.pk.replace("User#", "");
  }
}
